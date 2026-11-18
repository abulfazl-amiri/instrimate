import { Catch, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";

import AppError, { generateErrorCode } from "../../utils/error.util.js";

type ErrorDetails = {
  path?: string;
  message?: string;
};

type MappedError = {
  statusCode: number;
  message: string;
  errorCode?: string;
  details?: ErrorDetails[];
  operational: boolean;
};

const getMappedError = (exception: unknown): MappedError => {
  if (exception instanceof AppError) {
    return {
      statusCode: exception.statusCode,
      message: exception.message,
      errorCode: exception.errorCode,
      details: exception.details,
      operational: true,
    };
  }

  if (exception instanceof Error && exception.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      message: "Session expired, please log in again",
      operational: true,
    };
  }

  if (exception instanceof Error && exception.name === "JsonWebTokenError") {
    return {
      statusCode: 401,
      message: "Invalid token, please log in again",
      operational: true,
    };
  }

  if (exception instanceof Error && exception.name === "ValidationError") {
    const errors = (exception as Error & { errors?: Record<string, ErrorDetails> }).errors ?? {};
    return {
      statusCode: 422,
      message: "Validation failed",
      details: Object.values(errors),
      operational: true,
    };
  }

  if (
    typeof exception === "object" &&
    exception !== null &&
    "code" in exception &&
    exception.code === 11000
  ) {
    const keyValue =
      "keyValue" in exception && typeof exception.keyValue === "object" && exception.keyValue
        ? Object.keys(exception.keyValue)[0]
        : "value";
    const field = keyValue.slice(0, 1).toUpperCase() + keyValue.slice(1);
    return {
      statusCode: 409,
      message: `${field} already exists`,
      operational: true,
    };
  }

  return {
    statusCode: 500,
    message: "Something went wrong",
    operational: false,
  };
};

@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const mapped = getMappedError(exception);
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment || !mapped.operational) console.error(exception);

    const responseBody: Record<string, unknown> = {
      message: mapped.operational ? mapped.message : "Something went wrong",
      errorCode: mapped.errorCode || generateErrorCode(mapped.statusCode),
    };

    if (isDevelopment) {
      if (mapped.details) responseBody.details = mapped.details;
      if (exception instanceof Error) responseBody.stack = exception.stack;
    }

    host.switchToHttp().getResponse<Response>().status(mapped.statusCode).json(responseBody);
  }
}
