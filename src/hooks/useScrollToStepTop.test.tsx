import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scrollMessageIntoView,
  useScrollActiveTabIntoView,
  useScrollMessageIntoView,
  useScrollToStepTop,
} from "./useScrollToStepTop";

function Probe({ step }: { step: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollToStepTop(ref, step);
  return (
    <div ref={ref} data-testid="root" data-step-scroll-root>
      <h2 data-step-heading data-testid="heading">
        Step {step}
      </h2>
      <input data-testid="field" aria-label="field" />
      <button type="button">next</button>
    </div>
  );
}

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: reduced && query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

describe("useScrollToStepTop", () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0) as unknown as number,
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not steal focus from a field the user is already typing in (still scrolls)", () => {
    const { rerender, getByTestId } = render(<Probe step={0} />);
    getByTestId("field").focus();
    rerender(<Probe step={1} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(getByTestId("field"));
  });

  it("does not scroll on the first render", () => {
    render(<Probe step={0} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls smoothly to the card top and focuses the heading when the step changes", () => {
    const { rerender, getByTestId } = render(<Probe step={0} />);
    rerender(<Probe step={1} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
    const heading = getByTestId("heading");
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(heading);
  });

  it("uses instant scrolling under prefers-reduced-motion", () => {
    stubMatchMedia(true);
    const { rerender } = render(<Probe step={0} />);
    rerender(<Probe step={1} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  });

  it("does not scroll again when the step is unchanged (re-render with same key)", () => {
    const { rerender } = render(<Probe step={0} />);
    rerender(<Probe step={1} />);
    act(() => {
      vi.runAllTimers();
    });
    scrollIntoView.mockClear();
    rerender(<Probe step={1} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls on every subsequent change (back and forth)", () => {
    const { rerender } = render(<Probe step={0} />);
    for (const s of [1, 2, 1]) {
      rerender(<Probe step={s} />);
      act(() => {
        vi.runAllTimers();
      });
    }
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it("treats null as not-ready: leaving it is not a step change", () => {
    const { rerender } = render(<Probe step={null} />);
    rerender(<Probe step={2} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
    rerender(<Probe step={3} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("scrollMessageIntoView uses block nearest", () => {
    const el = document.createElement("p");
    el.scrollIntoView = scrollIntoView as unknown as typeof el.scrollIntoView;
    scrollMessageIntoView(el);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    expect(() => scrollMessageIntoView(null)).not.toThrow();
  });

  it("useScrollMessageIntoView scrolls only when a message appears", () => {
    function Msg({ text }: { text: string }) {
      const ref = useRef<HTMLParagraphElement>(null);
      useScrollMessageIntoView(ref, text);
      return text ? <p ref={ref}>{text}</p> : null;
    }
    const { rerender } = render(<Msg text="" />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
    rerender(<Msg text="Сохранено" />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
  });

  it("useScrollActiveTabIntoView centers the selected tab horizontally", () => {
    function Tabs({ active }: { active: string }) {
      const ref = useRef<HTMLUListElement>(null);
      useScrollActiveTabIntoView(ref, active);
      return (
        <ul ref={ref}>
          {["a", "b", "c"].map((id) => (
            <li key={id}>
              <button type="button" role="tab" aria-selected={id === active} data-id={id} />
            </li>
          ))}
        </ul>
      );
    }
    const { rerender } = render(<Tabs active="a" />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenLastCalledWith({ inline: "center", block: "nearest" });
    expect(scrollIntoView.mock.contexts.at(-1)).toHaveProperty("dataset.id", "a");
    rerender(<Tabs active="c" />);
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView.mock.contexts.at(-1)).toHaveProperty("dataset.id", "c");
  });
});
