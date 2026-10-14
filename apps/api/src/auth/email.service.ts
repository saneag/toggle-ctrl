import { Injectable, InternalServerErrorException } from "@nestjs/common";

import nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  async send(to: string, subject: string, text: string): Promise<void> {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) {
      throw new InternalServerErrorException("SMTP_HOST and SMTP_FROM must be configured");
    }

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
      throw new InternalServerErrorException("Email delivery failed");
    }
  }

  webUrl(): string {
    return process.env.WEB_APP_URL ?? "http://localhost:3000";
  }
}
