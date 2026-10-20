import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  specialistHomeCertificateMetric,
  specialistHomeMetricsFromWallet,
} from "./metrics.ts";

describe("specialistHomeMetricsFromWallet", () => {
  it("maps MASTER wallet totals without treating errors as zero", () => {
    const err = specialistHomeMetricsFromWallet(null, "Сеть");
    assert.equal(err.accrued.state, "error");
    assert.equal(err.received.state, "error");

    const ok = specialistHomeMetricsFromWallet(
      { role: "MASTER", totalRub: 1200, paidRub: 300, pendingRub: 900, count: 2 },
      null,
    );
    assert.equal(ok.accrued.state, "ok");
    assert.equal(ok.accrued.rub, 1200);
    assert.equal(ok.received.rub, 300);
  });

  it("rejects non-MASTER wallet role for specialist home", () => {
    const agent = specialistHomeMetricsFromWallet(
      { role: "AGENT", totalRub: 1, paidRub: 0, pendingRub: 1, count: 1 },
      null,
    );
    assert.equal(agent.accrued.state, "error");
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
    assert.equal(specialistHomeCertificateMetric(null, "fail").state, "error");
  });
});
