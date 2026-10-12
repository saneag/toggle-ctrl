import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.enableCors({
    origin: "http://localhost:3000",
  });

  app.setGlobalPrefix("api");

  await app.listen(process.env.PORT ?? 5000);
}
await bootstrap();
