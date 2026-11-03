import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeading } from "@/components/ui/PageHeading";
import {
  CabinetPageDetailLoadingSkeleton,
  CabinetPageLoadingSkeletonBody,
} from "@/components/layout/CabinetPageLoadingSkeleton";

describe("cabinet loading heading geometry", () => {
  it("gate body skeleton does not render an h1 (avoids duplicate with page PageHeading)", () => {
    render(
      <>
        <PageHeading eyebrow="АГЕНТ" title="Сертификаты" description="Desc" />
        <CabinetPageLoadingSkeletonBody />
      </>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Сертификаты");
  });

  it("detail route skeleton reserves heading block height without list title text", () => {
    render(<CabinetPageDetailLoadingSkeleton />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByTestId("cabinet-page-heading-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("cabinet-page-loading-body")).toBeInTheDocument();
  });
});
