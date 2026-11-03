import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CertificateListResponse } from "../certificate-types.ts";
import type { WalletBalanceResponse } from "../history-types.ts";
import {
  specialistHomeCertificateMetric,
  specialistHomeMetricsFromWallet,
} from "./metrics.ts";

const masterBase = {
  role: "MASTER" as const,
  pendingRub: 0,
  count: 0,
};

describe("specialistHomeMetricsFromWallet", () => {
  it("maps MASTER wallet totals without treating errors as zero", () => {
    const err = specialistHomeMetricsFromWallet(null, "Сеть");
    assert.equal(err.accrued.state, "error");
    assert.equal(err.received.state, "error");

    const ok = specialistHomeMetricsFromWallet(
      { ...masterBase, totalRub: 1200, paidRub: 300, count: 2 },
      null,
    );
    assert.equal(ok.accrued.state, "ok");
    assert.equal(ok.accrued.rub, 1200);
    assert.equal(ok.received.state, "ok");
    assert.equal(ok.received.rub, 300);
  });

  it("rejects non-MASTER wallet role for specialist home", () => {
    const agent = specialistHomeMetricsFromWallet(
      { role: "AGENT", totalRub: 1, paidRub: 0, pendingRub: 1, count: 1 },
      null,
    );
    assert.equal(agent.accrued.state, "error");
  });

  it("returns error slice for bad paidRub values without affecting valid totalRub", () => {
    for (const paidRub of [undefined, null, NaN, Infinity, -Infinity, "0"]) {
      const result = specialistHomeMetricsFromWallet(
        { ...masterBase, totalRub: 500, paidRub: paidRub as never },
        null,
      );
      assert.equal(result.accrued.state, "ok");
      assert.equal(result.accrued.rub, 500);
      assert.equal(result.received.state, "error");
      assert.notEqual(result.received.state, "empty");
      assert.notEqual(result.received.state, "ok");
    }
  });

  it("returns error slice for bad totalRub while paidRub stays ok", () => {
    const result = specialistHomeMetricsFromWallet(
      { ...masterBase, totalRub: undefined as never, paidRub: 40 },
      null,
    );
    assert.equal(result.accrued.state, "error");
    assert.equal(result.received.state, "ok");
    assert.equal(result.received.rub, 40);
  });

  it("preserves finite values including zero and fractional kopecks", () => {
    const zero = specialistHomeMetricsFromWallet(
      { ...masterBase, totalRub: 0, paidRub: 0 },
      null,
    );
    assert.equal(zero.accrued.state, "ok");
    assert.equal(zero.accrued.rub, 0);
    assert.equal(zero.received.state, "ok");
    assert.equal(zero.received.rub, 0);

    const fractional = specialistHomeMetricsFromWallet(
      { ...masterBase, totalRub: 1234.56, paidRub: -10.5 },
      null,
    );
    assert.equal(fractional.accrued.rub, 1234.56);
    assert.equal(fractional.received.rub, -10.5);
  });

  it("keeps walletError path unchanged", () => {
    const result = specialistHomeMetricsFromWallet(
      { ...masterBase, totalRub: 1, paidRub: 1 } satisfies WalletBalanceResponse,
      "Сеть",
    );
    assert.equal(result.accrued.message, "Сеть");
    assert.equal(result.received.message, "Сеть");
  });
});

describe("specialistHomeCertificateMetric", () => {
  it("returns count on success and error slice on failure", () => {
    assert.equal(
      specialistHomeCertificateMetric({ certificates: [{ id: "1" } as never] }, null).state,
      "ok",
    );
    assert.equal(
      specialistHomeCertificateMetric({ certificates: [{ id: "1" } as never] }, null).value,
      1,
    );
    assert.equal(specialistHomeCertificateMetric({ certificates: [] }, null).value, 0);
    assert.equal(specialistHomeCertificateMetric(null, "fail").state, "error");
    assert.equal(specialistHomeCertificateMetric(null, null).state, "error");
    assert.equal(specialistHomeCertificateMetric({} as CertificateListResponse, null).state, "error");
    assert.equal(
      specialistHomeCertificateMetric({ certificates: "bad" as never }, null).state,
      "error",
    );
  });
});
