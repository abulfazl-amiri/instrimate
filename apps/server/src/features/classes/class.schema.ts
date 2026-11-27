import * as z from "zod";

const requiredString = () =>
  z.string({
    error: (issue) => (issue.input === undefined ? "This field is required" : "Must be a string"),
  });

const nameField = requiredString()
  .trim()
  .min(1, { error: "Name can't be empty" })
  .max(100, { error: "Name can't be more than 100 chars" });

const descriptionField = z
  .string({ error: "Must be a string" })
  .trim()
  .max(500, { error: "Description can't be more than 500 chars" });

const statusField = z.enum(["ACTIVE", "ARCHIVED"], { error: "Invalid status" });

export const createClassSchema = z.object({
  name: nameField,
  description: descriptionField.nullish(),
});

export const updateClassSchema = z.object({
  name: nameField.optional(),
  description: descriptionField.nullish(),
  status: statusField.optional(),
});

export const classFilterSchema = z
  .object({
    status: statusField.optional(),
    limit: z.number().int().optional(),
    page: z.number().int().optional(),
    sort: z.string().optional(),
  })
  .nullish();

export const classIdSchema = z.uuid();

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type ClassFilterInput = z.infer<typeof classFilterSchema>;
