import type { INestApplication } from "@nestjs/common";

export function configureCors(app: INestApplication): void {
  const origins = (process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Workspace-SDK-Key"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
}
