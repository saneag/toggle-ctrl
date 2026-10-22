import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

import type { Request, Response } from "express";

import { Prisma } from "../generated/prisma/client.js";
import type { DatabaseErrorResponse } from "./api-exception.types.js";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const databaseError = this.readDatabaseError(exception);

    if (databaseError) {
      response.status(databaseError.status).json({
        statusCode: databaseError.status,
        error: HttpStatus[databaseError.status],
        message: databaseError.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : typeof body === "object" && body !== null && "message" in body
            ? body.message
            : exception.message;

      response.status(status).json({
        statusCode: status,
        error: HttpStatus[status],
        message,
      });
      return;
    }

    this.logger.error(
      `Unhandled error for ${request.method} ${request.originalUrl}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "An unexpected server error occurred. Please try again.",
    });
  }

  private readDatabaseError(exception: unknown): DatabaseErrorResponse | undefined {
    if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) return undefined;

    switch (exception.code) {
      case "P2002":
        return {
          status: HttpStatus.CONFLICT,
          message: "A record with these details already exists",
        };
      case "P2025":
        return { status: HttpStatus.NOT_FOUND, message: "The requested record was not found" };
      case "P2003":
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "The request references an invalid record",
        };
      default:
        return undefined;
    }
  }
}
