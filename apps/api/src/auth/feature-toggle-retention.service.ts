import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { featureToggleRetentionMs } from "./feature-toggle.service.js";

const cleanupIntervalMs = 60 * 1000;

@Injectable()
export class FeatureToggleRetentionService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(FeatureToggleRetentionService.name);
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.deleteExpiredToggles();
    this.cleanupInterval = setInterval(() => void this.deleteExpiredToggles(), cleanupIntervalMs);
    this.cleanupInterval.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  private async deleteExpiredToggles(): Promise<void> {
    try {
      const result = await this.prisma.featureToggle.deleteMany({
        where: { archivedAt: { lte: new Date(Date.now() - featureToggleRetentionMs) } },
      });
      if (result.count > 0) {
        this.logger.log(
          `Permanently deleted ${result.count} feature toggle(s) past the restore window`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Could not delete feature toggles past the restore window",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
