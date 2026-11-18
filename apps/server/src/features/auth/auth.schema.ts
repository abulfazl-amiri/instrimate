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

export const signupSchema = z.object({
  email: emailField,
  password: passwordField,
  name: requiredString().trim().max(50, {
    error: "Name can't be more than 50 chars",
  }),
});

export const signinSchema = z.object({
  email: emailField,
  password: requiredString(),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordField,
  resetToken: requiredString(),
});

export const confirmPasswordSchema = z.object({
  password: requiredString(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmPasswordInput = z.infer<typeof confirmPasswordSchema>;
