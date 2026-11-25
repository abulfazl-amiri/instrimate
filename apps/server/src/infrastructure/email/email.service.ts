import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import AppError from "../../common/errors/app-error.js";

type SendEmailInput = {
  to: string;
  subject: string;
  message: string;
  html?: string;
};

type EmailSender = (input: SendEmailInput) => Promise<void>;

const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const toHtml = (message: string): string =>
  `<p>${message.split("\n").map(escapeHtml).join("<br>")}</p>`;

@Injectable()
export class EmailService {
  private readonly sender: EmailSender;

  constructor() {
    const provider = process.env.EMAIL_PROVIDER ?? "resend";

    if (provider === "resend") {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");

      const resend = new Resend(apiKey);
      this.sender = async ({ to, subject, message, html }) => {
        const { error } = await resend.emails.send({
          from: "Instrimate <onboarding@resend.dev>",
          to,
          subject,
          text: message,
          html: html ?? toHtml(message),
        });
        if (error) throw error;
      };
      return;
    }

    if (provider === "smtp") {
      const host = process.env.EMAIL_SMTP_HOST;
      if (!host) throw new Error("EMAIL_SMTP_HOST is required when EMAIL_PROVIDER=smtp");

      const port = Number(process.env.EMAIL_SMTP_PORT ?? "1025");
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("EMAIL_SMTP_PORT must be a valid port number");
      }

      const secureValue = process.env.EMAIL_SMTP_SECURE ?? "false";
      if (secureValue !== "true" && secureValue !== "false") {
        throw new Error("EMAIL_SMTP_SECURE must be true or false");
      }

      const user = process.env.EMAIL_SMTP_USER;
      const password = process.env.EMAIL_SMTP_PASSWORD;
      if (Boolean(user) !== Boolean(password)) {
        throw new Error("EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD must be set together");
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secureValue === "true",
        ...(user && password ? { auth: { user, pass: password } } : {}),
      });

      this.sender = async ({ to, subject, message, html }) => {
        await transporter.sendMail({
          from: "Instrimate <onboarding@resend.dev>",
          to,
          subject,
          text: message,
          html: html ?? toHtml(message),
        });
      };
      return;
    }

    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    try {
      await this.sender(input);
    } catch (error) {
      throw new AppError("Unable to send email", 503, { cause: error });
    }
  }
}
