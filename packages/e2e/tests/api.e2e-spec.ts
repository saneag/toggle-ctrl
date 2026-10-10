import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import request from "supertest";
import { App } from "supertest/types.js";

import { AppModule } from "../../../apps/api/src/app.module.js";

describe("API", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("responds to GET /", () => {
    return request(app.getHttpServer()).get("/").expect(200).expect("Hello World!");
  });

  afterEach(async () => {
    await app.close();
  });
});
