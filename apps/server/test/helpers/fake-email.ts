export type SentEmail = {
  to: string;
  subject: string;
  message: string;
  html?: string;
};

/**
 * Stands in for EmailService. Captures every email so tests can read
 * verification codes and reset links, and can simulate a provider outage.
 */
export class FakeEmailService {
  readonly sent: SentEmail[] = [];
  private pendingFailures = 0;

  async sendEmail(input: SentEmail): Promise<void> {
    if (this.pendingFailures > 0) {
      this.pendingFailures -= 1;
      throw new Error("Simulated email provider failure");
    }
    this.sent.push(input);
  }

  /** Make the next `count` sends fail. */
  failNext(count = 1): void {
    this.pendingFailures += count;
  }

  sentTo(email: string): SentEmail[] {
    return this.sent.filter((sent) => sent.to === email);
  }

  lastTo(email: string): SentEmail {
    const last = this.sentTo(email).at(-1);
    if (!last) throw new Error(`No email was sent to ${email}`);
    return last;
  }

  verificationCode(email: string): string {
    const match = /^(\d{6})$/m.exec(this.lastTo(email).message);
    if (!match) throw new Error(`Last email to ${email} has no verification code`);
    return match[1]!;
  }

  resetToken(email: string): string {
    const match = /reset-password\?token=(\S+)/.exec(this.lastTo(email).message);
    if (!match) throw new Error(`Last email to ${email} has no reset link`);
    return match[1]!;
  }

  clear(): void {
    this.sent.length = 0;
    this.pendingFailures = 0;
  }
}
