import type { PipeTransform } from "@nestjs/common";
import * as z from "zod";

import AppError from "../../utils/error.util.js";

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: issue.message,
      }));
      throw new AppError("Validation failed", 422, details);
    }

    return result.data;
  }
}
