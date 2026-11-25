import * as z from "zod";

const requiredString = () =>
  z.string({
    error: (issue) => (issue.input === undefined ? "This field is required" : "Must be a string"),
  });

const emailField = z.email({
  error: (issue) =>
    issue.input === undefined ? "This field is required" : "Must be a valid email",
});

const passwordField = requiredString().min(8, {
  error: "Must be at least 8 characters",
});

const nameField = requiredString()
  .trim()
  .min(1, { error: "Name can't be empty" })
  .max(50, { error: "Name can't be more than 50 chars" });

const roleField = requiredString()
  .trim()
  .pipe(z.enum(["ADMIN", "TEACHER"], { error: "Invalid role" }));

export const updateRoleSchema = z.object({
  role: roleField,
});

export const changePasswordSchema = z.object({
  oldPassword: requiredString(),
  newPassword: passwordField,
});

export const updateSchema = z.object({
  email: emailField.optional(),
  name: nameField.optional(),
});

export const userFilterSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    role: z.enum(["ADMIN", "TEACHER"]).optional(),
    limit: z.number().int().optional(),
    page: z.number().int().optional(),
    sort: z.string().optional(),
  })
  .nullish();

export const userIdSchema = z.uuid();

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserInput = z.infer<typeof updateSchema>;
