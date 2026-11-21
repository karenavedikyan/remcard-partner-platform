import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrScanner } from "./QrScanner";

const { start, stop } = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: class {
    start = start;
    stop = stop;
  },
}));

describe("QR camera lifecycle", () => {
  it("keeps the camera active through callback changes and uses the latest callback", async () => {
    start.mockReset().mockResolvedValue(undefined);
    stop.mockReset().mockResolvedValue(undefined);
    const before = vi.fn();
    const after = vi.fn();
    const view = render(<QrScanner onCode={before} onError={vi.fn()} />);
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    view.rerender(<QrScanner onCode={after} onError={vi.fn()} />);
    expect(stop).not.toHaveBeenCalled();
    const decode = start.mock.calls[0][2];
    await act(async () => decode("RC-TEST-123"));
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledExactlyOnceWith("RC-TEST-123");
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("tolerates leaving the screen while camera startup is pending", async () => {
    let finish = () => {};
    start.mockReset().mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    stop.mockReset().mockImplementation(() => { throw new Error("Camera is not running"); });
    const onError = vi.fn();
    const view = render(<QrScanner onCode={vi.fn()} onError={onError} />);
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(() => view.unmount()).not.toThrow();
    await act(async () => finish());
    expect(onError).not.toHaveBeenCalled();
  });
});
