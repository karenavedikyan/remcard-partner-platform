import { beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import {
  postObserverPersonalBatch,
  personalMutationFailedIds,
} from "./observer-personal-api";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(),
  remcardFetch: vi.fn(),
}));
const api = vi.mocked(remcardFetch);
const ids = ["first", "second", "third"];
const projection = (appealId: string) => ({
  appealId, alias: null, tag: "Метка", note: "Заметка", bucket: "active",
  version: 2, updatedAt: "2026-11-14T16:00:00Z",
});
const response = (processed: string[], skipped: string[]) => ({
  action: "setTag", mode: "best_effort",
  processedCount: processed.length, skippedCount: skipped.length,
  processed: processed.map(projection),
  skipped: skipped.map((appealId) => ({ appealId, reason: "version_conflict" })),
});
const run = () => postObserverPersonalBatch({ action: "setTag", ids, tag: "Метка" });

beforeEach(() => { api.mockReset(); });

describe("personal batch response: только подтверждённые результаты запроса", () => {
  it("полный корректный ответ остаётся full", async () => {
    api.mockResolvedValueOnce(response(ids, []));
    const result = await run();
    expect(result).toMatchObject({ ok: true, kind: "full", appliedIds: ids });
    expect(personalMutationFailedIds(result)).toEqual([]);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("обычный partial сохраняет skipped ID", async () => {
    api.mockResolvedValueOnce(response([ids[0]], ids.slice(1)));
    const result = await run();
    expect(result).toMatchObject({ ok: true, kind: "partial", appliedIds: [ids[0]] });
    expect(personalMutationFailedIds(result)).toEqual(ids.slice(1));
  });
  it("неполный ответ не объявляет пропущенный ID сохранённым", async () => {
    api.mockResolvedValueOnce(response(ids.slice(0, 2), []));
    const result = await run();
    expect(result).toMatchObject({ ok: true, kind: "partial", appliedIds: ids.slice(0, 2) });
    expect(personalMutationFailedIds(result)).toEqual([ids[2]]);
  });
  it("пустой ответ не становится успешным", async () => {
    api.mockResolvedValueOnce(response([], []));
    expect(await run()).toMatchObject({ ok: false, kind: "error", preserveUi: true });
  });
  it("полностью отклонённый запрос остаётся ошибкой с failed ID", async () => {
    api.mockResolvedValueOnce(response([], ids));
    const result = await run();
    expect(result).toMatchObject({ ok: false, kind: "error", preserveUi: true });
    expect(personalMutationFailedIds(result)).toEqual(ids);
  });
  it("посторонние ID не попадают в overlay и не подтверждают requested ID", async () => {
    api.mockResolvedValueOnce(response([ids[0], "foreign-id"], [ids[1]]));
    const result = await run();
    expect(result).toMatchObject({ ok: true, kind: "partial", appliedIds: [ids[0]] });
    expect(personalMutationFailedIds(result)).toEqual(ids.slice(1));
    if (result.ok) {
      expect(result.projections).not.toHaveProperty("foreign-id");
      expect(result.metaById).not.toHaveProperty("foreign-id");
    }
  });
  it("дубли processed не увеличивают число подтверждённых записей", async () => {
    api.mockResolvedValueOnce(response([ids[0], ids[0]], ids.slice(1)));
    const result = await run();
    expect(result).toMatchObject({ ok: true, kind: "partial", appliedIds: [ids[0]] });
  });
  it("противоречивый processed+skipped не становится успехом", async () => {
    api.mockResolvedValueOnce(response([ids[0], ids[1]], [ids[1], ids[2]]));
    const result = await run();
    expect(result).toMatchObject({ ok: true, kind: "partial", appliedIds: [ids[0]] });
    expect(personalMutationFailedIds(result)).toEqual(ids.slice(1));
    if (result.ok) expect(result.projections).not.toHaveProperty(ids[1]);
  });
  it("ID с пробелами в ответе не подтверждает другой opaque ID", async () => {
    api.mockResolvedValueOnce(response([` ${ids[0]} `, ids[1]], [ids[2]]));
    const result = await run();
    expect(result).toMatchObject({ ok: true, kind: "partial", appliedIds: [ids[1]] });
    expect(personalMutationFailedIds(result)).toEqual([ids[0], ids[2]]);
  });
});
