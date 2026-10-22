import { NestFactory } from "@nestjs/core";

import "dotenv/config";

import { AppModule } from "./app.module.js";
import { configureApp } from "./config/app.config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  await app.listen(process.env.PORT ?? 5000);
}
await bootstrap();
