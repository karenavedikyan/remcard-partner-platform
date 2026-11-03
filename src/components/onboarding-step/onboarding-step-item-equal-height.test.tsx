import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OnboardingStepItem } from "@/components/onboarding-step/OnboardingStepItem";
import type { OnboardingStepAction } from "@/lib/onboarding-step/types";

const sharedCssPath = join(
  import.meta.dirname,
  "onboarding-step-item.module.css",
);

function blockForSelector(source: string, selector: string): string {
  const marker = `${selector} {`;
  const start = source.indexOf(marker);
  expect(start, `missing ${selector}`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed block for ${selector}`);
}

describe("onboarding step card stretch styles", () => {
  it("fills grid row height on actionable and static cards", () => {
    const source = readFileSync(sharedCssPath, "utf8");
    for (const selector of [".stepAction", ".stepStatic"]) {
      const block = blockForSelector(source, selector);
      expect(block).toMatch(/height:\s*100%/);
      expect(block).toMatch(/width:\s*100%/);
      expect(block).toMatch(/box-sizing:\s*border-box/);
    }

    const mobileBlock = source.slice(source.indexOf("@media (max-width: 680px)"));
    expect(mobileBlock).toMatch(/padding:\s*var\(--space-4\)/);
    expect(mobileBlock).toMatch(/border-radius:\s*14px/);
  });

  it("renders mixed link, button, and static steps under the same list item structure", () => {
    const steps: Array<{
      title: string;
      note: string;
      action: OnboardingStepAction;
    }> = [
      { title: "Link step", note: "Opens a route", action: { kind: "link", href: "/scanner" } },
      {
        title: "Button step",
        note: "Runs handler",
        action: { kind: "button", handler: "onAddClient" },
      },
      { title: "Static step", note: "Read only", action: { kind: "none" } },
    ];

    const { container } = render(
      <ol className="steps">
        {steps.map((step, index) => (
          <li className="step" key={step.title}>
            <OnboardingStepItem
              index={index}
              title={step.title}
              note={step.note}
              action={step.action}
              handlers={{ onAddClient: () => undefined }}
              iconSlot={<span aria-hidden="true">ico</span>}
            />
          </li>
        ))}
      </ol>,
    );

    const items = container.querySelectorAll("ol.steps > li.step");
    expect(items).toHaveLength(3);
    items.forEach((li) => {
      expect(li.children).toHaveLength(1);
      const control = li.firstElementChild;
      expect(control).toBeTruthy();
      expect(control?.getAttribute("data-onboarding-step")).toMatch(/link|button|static/);
    });

    expect(screen.getByRole("link", { name: /Link step/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Button step/i })).toBeInTheDocument();
    expect(screen.getByText("Static step")).toBeInTheDocument();
  });
});
