import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";

import AppError, { generateErrorCode } from "../errors/app-error.js";

type MappedError = {
  statusCode: number;
  message: string;
  errorCode?: string;
  details?: unknown;
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

  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    const responseMessage =
      typeof response === "object" && response !== null && "message" in response
        ? response.message
        : response;
    return {
      statusCode: exception.getStatus(),
      message: Array.isArray(responseMessage)
        ? responseMessage.join(", ")
        : typeof responseMessage === "string"
          ? responseMessage
          : exception.message,
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

  if (typeof exception === "object" && exception !== null && "code" in exception) {
    if (exception.code === "P2002") {
      const target =
        "meta" in exception && typeof exception.meta === "object" && exception.meta !== null
          ? "target" in exception.meta
            ? exception.meta.target
            : undefined
          : undefined;
      const field = Array.isArray(target) ? target[0] : target;
      const name = typeof field === "string" ? field : "Email";
      return {
        statusCode: 409,
        message: `${name.slice(0, 1).toUpperCase() + name.slice(1)} already exists`,
        operational: true,
      };
    }

    if (exception.code === "P2025") {
      return {
        statusCode: 404,
        message: "User not found",
        operational: true,
      };
    }
  }

  return {
    statusCode: 500,
    message: "Something went wrong",
    operational: false,
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
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
