export function generateErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION_ERROR";
    case 429:
      return "TOO_MANY_REQUESTS";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return "SERVER_ERROR";
  }
}

class AppError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details: unknown;
  readonly isOperational = true;

  constructor(message: string, code: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = code;
    this.errorCode = generateErrorCode(code);
    this.details = details;
  }
}

export default AppError;
