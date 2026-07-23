import { Logger } from '@nestjs/common';
import { Resend } from 'resend';

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
};

export class EmailService {
  private static client: Resend | null = null;
  private static readonly logger = new Logger(EmailService.name);

  private static getClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return null;
    }

    if (!this.client) {
      this.client = new Resend(apiKey);
    }

    return this.client;
  }

  static async send(opts: SendEmailOptions): Promise<void> {
    const client = this.getClient();
    const from = opts.from ?? process.env.RESEND_FROM_EMAIL;

    if (!client || !from) {
      this.logger.warn(
        `Email not sent (RESEND not configured). To: ${
          Array.isArray(opts.to) ? opts.to.join(', ') : opts.to
        } | Subject: ${opts.subject}\n${opts.body}`,
      );
      return;
    }

    const { error } = await client.emails.send({
      from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      text: opts.body,
      ...(opts.html ? { html: opts.html } : {}),
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
