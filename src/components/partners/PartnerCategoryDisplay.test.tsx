import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { displayCategoryLabel } from "@/lib/category-display";

function TermsPreviewTable({
  terms,
}: {
  terms: Array<{ category: string; categoryLabel: string; storePercent: number }>;
}) {
  return (
    <table>
      <tbody>
        {terms.map((term) => (
          <tr key={term.category}>
            <td>{displayCategoryLabel(term.category, term.categoryLabel)}</td>
            <td>{term.storePercent}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

describe("partner category display (invite preview pattern)", () => {
  it("shows Russian labels for flooring and handles when API sends raw keys", () => {
    render(
      <TermsPreviewTable
        terms={[
          { category: "doors", categoryLabel: "doors", storePercent: 10 },
          { category: "flooring", categoryLabel: "flooring", storePercent: 10 },
          { category: "handles", categoryLabel: "handles", storePercent: 10 },
        ]}
      />,
    );

    expect(screen.getByText("Двери")).toBeInTheDocument();
    expect(screen.getByText("Напольные покрытия")).toBeInTheDocument();
    expect(screen.getByText("Фурнитура и замки")).toBeInTheDocument();
    expect(screen.queryByText("flooring")).not.toBeInTheDocument();
    expect(screen.queryByText("handles")).not.toBeInTheDocument();
  });
});
