import { Injectable } from "@nestjs/common";
import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  message: string;
};

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail({ to, subject, message }: SendEmailInput) {
    return await this.resend.emails.send({
      from: "Instrimate <onboarding@resend.dev>",
      to,
      subject,
      text: message,
      html: `<p>${message}</p>`,
    });
  }
}
