import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  assertConfigured(): void {
    this.getConfiguration();
  }

  private getConfiguration() {
    // TODO(email-delivery): Configure an SMTP provider and sender before enabling invitation emails.
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) {
      throw new ServiceUnavailableException(
        "Email delivery is not configured. Set SMTP_HOST and SMTP_FROM before sending invitations.",
      );
    }
    return { host, from };
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    const { host, from } = this.getConfiguration();

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
        : undefined,
    });

    try {
      await transporter.sendMail({ from, to, subject, text });
    } catch {
      throw new ServiceUnavailableException("Email delivery failed. Check the SMTP settings.");
    }
  }

  webUrl(): string {
    return process.env.WEB_APP_URL ?? "http://localhost:3000";
  }
}
