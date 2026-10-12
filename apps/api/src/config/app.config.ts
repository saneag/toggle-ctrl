import type { INestApplication } from "@nestjs/common";

import { configureCors } from "./cors.config.js";
import { configureSwagger } from "./swagger.config.js";

export function configureApp(app: INestApplication): void {
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");

  configureCors(app);
  configureSwagger(app);
}
