import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');

    this.transporter = nodemailer.createTransport({
      host: 'ssl0.ovh.net',
      port: 465,
      secure: true,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get<string>('EMAIL_USER');

    const mailOptions = {
      from,
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email successfully sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    // Resolve template path - works in both dev and production
    const isProduction = process.env.NODE_ENV === 'production';
    const basePath = isProduction
      ? path.join(process.cwd(), 'dist', 'src', 'modules', 'mail')
      : path.join(process.cwd(), 'src', 'modules', 'mail');

    const templatePath = path.join(basePath, 'templates', 'resetPassword.html');

    let html: string;
    if (fs.existsSync(templatePath)) {
      html = fs.readFileSync(templatePath, 'utf8');
    } else {
      const fallbackPath = path.join(
        __dirname,
        'templates',
        'resetPassword.html',
      );
      if (fs.existsSync(fallbackPath)) {
        html = fs.readFileSync(fallbackPath, 'utf8');
      } else {
        throw new Error(
          `Template file not found at ${templatePath} or ${fallbackPath}`,
        );
      }
    }

    html = html.replace('{{resetLink}}', resetLink);

    await this.sendEmail(to, 'Password Reset Request', html);
  }
}
