import { ForbiddenException } from "@nestjs/common";

import type { PrismaService } from "../prisma/prisma.service.js";
import { FeatureToggleService } from "./feature-toggle.service.js";
import type { SessionUser } from "./types/session-user.js";

const user: SessionUser = {
  id: "user-1",
  name: "Taylor User",
  email: "taylor@example.com",
  plan: "FREE",
  sessionId: "session-1",
  csrfHash: "hash",
};

function makeService(role = "ADMIN") {
  const toggle = {
    id: "toggle-1",
    organizationId: "workspace-1",
    name: "checkout-flow",
    description: "Controls checkout",
    enabled: false,
    createdAt: new Date("2026-10-24T10:00:00.000Z"),
    updatedAt: new Date("2026-10-24T10:00:00.000Z"),
    createdById: user.id,
    createdByName: user.name,
    updatedById: user.id,
    updatedByName: user.name,
    archivedAt: null,
    archivedById: null,
    archivedByName: null,
  };
  const createToggle = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...toggle,
    ...data,
  }));
  const createEvent = vi.fn().mockResolvedValue({});
  const transaction = {
    featureToggle: { create: createToggle },
    featureToggleAuditEvent: { create: createEvent },
  };
  const prisma = {
    membership: {
      findUnique: vi.fn().mockResolvedValue({ role }),
    },
    $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    featureToggle: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    featureToggleSdkKey: {
      findUnique: vi.fn().mockResolvedValue({ key: "tc_live_valid-key" }),
    },
  } as unknown as PrismaService;
  return { service: new FeatureToggleService(prisma), prisma, createToggle, createEvent, toggle };
}

describe("FeatureToggleService", () => {
  it("creates a toggle off and records its creator in the audit event", async () => {
    const { service, createToggle, createEvent } = makeService();

    const result = await service.create(user, "workspace-1", {
      name: "checkout-flow",
      description: "Controls checkout",
    });

    expect(createToggle).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "workspace-1",
        name: "checkout-flow",
        enabled: false,
        createdById: user.id,
        createdByName: user.name,
      }),
    });
    expect(createEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CREATE", actorName: user.name }),
    });
    expect(result).toMatchObject({
      name: "checkout-flow",
      enabled: false,
      createdBy: user.name,
      updatedBy: user.name,
    });
  });

  it("creates an enabled toggle when requested and records that initial state", async () => {
    const { service, createToggle, createEvent } = makeService();

    await service.create(user, "workspace-1", { name: "new-checkout", enabled: true });

    expect(createToggle).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "new-checkout", enabled: true }),
    });
    expect(createEvent).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CREATE",
        afterState: expect.objectContaining({ enabled: true }),
      }),
    });
  });

  it("rejects names that are not lowercase kebab-case", async () => {
    const { service } = makeService();

    await expect(service.create(user, "workspace-1", { name: "Checkout Flow" })).rejects.toThrow(
      "Use lowercase letters and numbers, separated by hyphens, like test-feature-toggle",
    );
  });

  it("denies viewers permission to create toggles", async () => {
    const { service } = makeService("VIEWER");

    await expect(
      service.create(user, "workspace-1", { name: "checkout-flow" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("filters deleted toggles from workspace lists", async () => {
    const { service, prisma } = makeService();

    await service.list(user.id, "workspace-1");

    expect(prisma.featureToggle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "workspace-1", archivedAt: null } }),
    );
  });

  it("requires the workspace SDK key and lists only active public fields", async () => {
    const { service, prisma } = makeService();

    const result = await service.listPublic("workspace-1", "tc_live_valid-key");

    expect(prisma.featureToggle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "workspace-1", archivedAt: null },
        select: { id: true, name: true, description: true, enabled: true },
      }),
    );
    expect(result).toEqual({ toggles: [] });
    await expect(service.listPublic("workspace-1", "incorrect-key")).rejects.toThrow(
      "A valid workspace SDK key is required",
    );
  });
});
