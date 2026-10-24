import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FeatureToggle } from "../types.js";
import {
  createFeatureToggle,
  getFeatureToggleHistory,
  getFeatureToggleSdkKey,
  getFeatureToggles,
} from "../utils/feature-toggles.js";
import { FeatureTogglePanel } from "./feature-toggle-panel.js";

vi.mock("../utils/feature-toggles.js", () => ({
  archiveFeatureToggle: vi.fn(),
  createFeatureToggle: vi.fn(),
  getFeatureToggleHistory: vi.fn(),
  getFeatureToggleSdkKey: vi.fn(),
  getFeatureToggles: vi.fn(),
  rotateFeatureToggleSdkKey: vi.fn(),
  updateFeatureToggle: vi.fn(),
}));

const toggle: FeatureToggle = {
  id: "toggle-1",
  name: "checkout-flow",
  description: "Controls checkout",
  enabled: false,
  createdAt: "2026-10-24T10:00:00.000Z",
  updatedAt: "2026-10-24T11:00:00.000Z",
  createdBy: "Taylor User",
  updatedBy: "Morgan Admin",
};

function renderPanel(role = "ADMIN") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FeatureTogglePanel organizationId="workspace-1" role={role} />
    </QueryClientProvider>,
  );
}

describe("FeatureTogglePanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.mocked(getFeatureToggles).mockResolvedValue([toggle]);
    vi.mocked(getFeatureToggleHistory).mockResolvedValue([]);
    vi.mocked(getFeatureToggleSdkKey).mockResolvedValue({
      key: "tc_live_example",
      rotatedAt: "2026-10-24T10:00:00.000Z",
    });
    vi.mocked(createFeatureToggle).mockResolvedValue(toggle);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows state and creator and updater attribution", async () => {
    renderPanel("VIEWER");

    expect(await screen.findByRole("heading", { name: "checkout-flow" })).toBeInTheDocument();
    expect(screen.getByText(/Created by Taylor User/)).toBeInTheDocument();
    expect(screen.getByText(/Updated by Morgan Admin/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create toggle" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("creates a toggle with its selected initial state", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Create toggle" }));
    fireEvent.change(screen.getByLabelText("Toggle name"), {
      target: { value: "test-feature-toggle" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "A test rollout" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "Start enabled" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Create toggle" }).at(-1)!);

    await waitFor(() =>
      expect(createFeatureToggle).toHaveBeenCalledWith("workspace-1", {
        name: "test-feature-toggle",
        description: "A test rollout",
        enabled: true,
      }),
    );
  });
});
