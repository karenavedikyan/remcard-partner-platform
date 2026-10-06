import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RemcardApiError } from "./api-client.ts";
import {
  canCheckUncertainOrder,
  canSubmitOrder,
  reduceOrderSubmitState,
  validateOrderCreateResponse,
} from "./scanner-order-submit.ts";

const VALID_ORDER = {
  order: { id: "ord-1" },
  summary: {
    totalAmount: 1000,
    discountAmount: 50,
    isSelfScan: false,
    issuerBonusAmount: 100,
  },
};

const initialState = {
  submitting: false,
  orderUncertain: false,
  orderConflict: false,
  submitError: "",
  success: null,
  postCount: 0,
};

describe("validateOrderCreateResponse", () => {
  it("accepts a well-formed 201 payload", () => {
    const data = validateOrderCreateResponse(VALID_ORDER);
    assert.equal(data.order.id, "ord-1");
    assert.equal(data.summary.totalAmount, 1000);
  });

  it("rejects empty body", () => {
    assert.throws(() => validateOrderCreateResponse(null));
    assert.throws(() => validateOrderCreateResponse(undefined));
  });

  it("rejects malformed structure", () => {
    assert.throws(() => validateOrderCreateResponse({ order: { id: "" }, summary: {} }));
    assert.throws(() =>
      validateOrderCreateResponse({
        order: { id: "x" },
        summary: { totalAmount: "100", discountAmount: 0, isSelfScan: false },
      }),
    );
  });
});

describe("reduceOrderSubmitState", () => {
  it("marks malformed 201 JSON payload as uncertain and blocks retry", () => {
    const started = reduceOrderSubmitState(initialState, { type: "submit_start" });
    assert.equal(started.postCount, 1);
    assert.equal(started.submitting, true);

    const broken = reduceOrderSubmitState(started, {
      type: "submit_success",
      payload: { order: { id: "x" } },
    });

    assert.equal(broken.orderUncertain, true);
    assert.equal(broken.success, null);
    assert.equal(canSubmitOrder(broken), false);
    assert.equal(broken.postCount, 1);
  });

  it("marks empty 201 body as uncertain", () => {
    const started = reduceOrderSubmitState(initialState, { type: "submit_start" });
    const uncertain = reduceOrderSubmitState(started, {
      type: "submit_success",
      payload: null,
    });
    assert.equal(uncertain.orderUncertain, true);
    assert.equal(canSubmitOrder(uncertain), false);
  });

  it("accepts valid 201 and shows success", () => {
    const started = reduceOrderSubmitState(initialState, { type: "submit_start" });
    const done = reduceOrderSubmitState(started, {
      type: "submit_success",
      payload: VALID_ORDER,
    });
    assert.equal(done.orderUncertain, false);
    assert.equal(done.orderConflict, false);
    assert.equal(done.success?.order.id, "ord-1");
    assert.equal(done.submitError, "");
  });

  it("keeps form editable on validation 400 without marking uncertain", () => {
    const started = reduceOrderSubmitState(initialState, { type: "submit_start" });
    const failed = reduceOrderSubmitState(started, {
      type: "submit_error",
      error: new RemcardApiError(400, "Некорректная сумма"),
      wasRetry: false,
    });
    assert.equal(failed.orderUncertain, false);
    assert.equal(failed.orderConflict, false);
    assert.equal(failed.submitError, "Некорректная сумма");
    assert.equal(canSubmitOrder(failed), true);
    assert.equal(failed.postCount, 1);
  });

  it("marks 504 as uncertain without second POST", () => {
    let state = initialState;
    state = reduceOrderSubmitState(state, { type: "submit_start" });
    state = reduceOrderSubmitState(state, {
      type: "submit_error",
      error: new RemcardApiError(504, "Upstream timeout"),
      wasRetry: false,
    });
    assert.equal(state.orderUncertain, true);
    assert.equal(canSubmitOrder(state), false);

    const blocked = reduceOrderSubmitState(state, { type: "submit_start" });
    assert.equal(blocked.postCount, 1);
    assert.equal(blocked.submitting, false);
  });

  it("409 sets conflict state without clearing key semantics", () => {
    const started = reduceOrderSubmitState(initialState, { type: "submit_start" });
    const failed = reduceOrderSubmitState(started, {
      type: "submit_error",
      error: new RemcardApiError(409, "Idempotency-Key уже использован с другим телом запроса"),
      wasRetry: true,
    });
    assert.equal(failed.orderUncertain, false);
    assert.equal(failed.orderConflict, true);
    assert.match(failed.submitError, /отличаются от уже отправленных/);
    assert.equal(canSubmitOrder(failed), false);
    assert.equal(canCheckUncertainOrder(failed), false);
  });

  it("409 after reload: conflict persists, no normal confirm", () => {
    const conflictState = {
      ...initialState,
      orderConflict: true,
      submitError: "Данные этой попытки отличаются от уже отправленных.",
    };
    assert.equal(canSubmitOrder(conflictState), false);
    assert.equal(canCheckUncertainOrder(conflictState), false);
  });

  it("retry 400 keeps uncertain (unknown_persist)", () => {
    const uncertain = { ...initialState, orderUncertain: true };
    const retry = reduceOrderSubmitState(uncertain, { type: "retry_check_start" });
    const after = reduceOrderSubmitState(retry, {
      type: "submit_error",
      error: new RemcardApiError(400, "bad"),
      wasRetry: true,
    });
    assert.equal(after.orderUncertain, true);
    assert.equal(after.orderConflict, false);
  });

  it("allows retry check when uncertain", () => {
    const uncertain = { ...initialState, orderUncertain: true };
    assert.equal(canCheckUncertainOrder(uncertain), true);
    const retry = reduceOrderSubmitState(uncertain, { type: "retry_check_start" });
    assert.equal(retry.submitting, true);
    assert.equal(retry.postCount, 1);
  });

  it("treats 201 with invalid JSON error as uncertain", () => {
    const started = reduceOrderSubmitState(initialState, { type: "submit_start" });
    const uncertain = reduceOrderSubmitState(started, {
      type: "submit_error",
      error: new RemcardApiError(201, "Некорректный ответ сервера"),
      wasRetry: false,
    });
    assert.equal(uncertain.orderUncertain, true);
    assert.equal(canSubmitOrder(uncertain), false);
  });

  it("401 on retry preserves uncertain state", () => {
    const uncertain = { ...initialState, orderUncertain: true };
    const retry = reduceOrderSubmitState(uncertain, { type: "retry_check_start" });
    const after = reduceOrderSubmitState(retry, {
      type: "submit_error",
      error: new RemcardApiError(401, "Unauthorized"),
      wasRetry: true,
    });
    assert.equal(after.orderUncertain, true);
  });
});
