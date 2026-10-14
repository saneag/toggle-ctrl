import type { INestApplication } from "@nestjs/common";

import { ApiExceptionFilter } from "./api-exception.filter.js";
import { configureCors } from "./cors.config.js";
import { configureSwagger } from "./swagger.config.js";

export function configureApp(app: INestApplication): void {
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new ApiExceptionFilter());

  configureCors(app);
  configureSwagger(app);
}
