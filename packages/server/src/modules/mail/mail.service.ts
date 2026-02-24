import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

    this.logger.log(`Initializing email transporter...`);

    if (!user || !pass) {
      this.logger.error('EMAIL_USER or EMAIL_PASS not configured');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email transporter is ready');
      }
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const from = this.configService.get<string>('EMAIL_USER');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');

    // Get the correct base path - if we're in packages/server, use current dir, otherwise use packages/server
    const basePath =
      process.cwd().endsWith('packages\\server') || process.cwd().endsWith('packages/server')
        ? process.cwd()
        : path.join(process.cwd(), 'packages', 'server');

    // Read logo files
    const logoPath = path.join(basePath, 'images', 'logo.svg');
    const facebookPath = path.join(basePath, 'images', 'facebook.svg');
    const instagramPath = path.join(basePath, 'images', 'instagram.svg');
    const linkedinPath = path.join(basePath, 'images', 'linkedin.svg');

    const mailOptions = {
      from: `"Finora" <${from}>`,
      to,
      subject,
      html,
      attachments: [
        {
          filename: 'logo.svg',
          path: logoPath,
          cid: 'logo@finora',
        },
        {
          filename: 'facebook.svg',
          path: facebookPath,
          cid: 'facebook@finora',
        },
        {
          filename: 'instagram.svg',
          path: instagramPath,
          cid: 'instagram@finora',
        },
        {
          filename: 'linkedin.svg',
          path: linkedinPath,
          cid: 'linkedin@finora',
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${to}:`, errorMessage);
      throw new Error('Failed to send email', { cause: error });
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const html = this.getEmailTemplate(
      'Réinitialisation de votre mot de passe',
      `
      <p style="font-size: 15px; color: #666;">Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p style="font-size: 15px; color: #666;">Cliquez sur le bouton ci-dessous pour en créer un nouveau :</p>
      <center><a href="${resetLink}" style="display: inline-block; margin: 25px 0; padding: 16px 48px; background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Réinitialiser mon mot de passe</a></center>
    `
    );
    await this.sendEmail(to, 'Réinitialisation de votre mot de passe', html);
  }

  async sendAccountCreatedWithPasswordEmail(
    to: string,
    username: string,
    password: string,
    firmName: string,
    accountType: 'Comptable' | 'Collaborateur' | 'Client'
  ): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    const html = this.getEmailTemplate(
      `🎉 Bienvenue sur FINORA !`,
      `
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour,</p>
      <p style="font-size: 15px; color: #666; margin-bottom: 15px;">Votre compte ${accountType.toLowerCase()} a été créé avec succès !</p>
      <div style="background-color: #f8f9fa; border-left: 4px solid #1976d2; padding: 20px; margin: 25px 0; border-radius: 4px;">
        <strong style="color: #1976d2; display: block; margin-bottom: 10px;">📋 Informations de votre compte :</strong>
        <div style="font-size: 14px; color: #555; margin: 8px 0;">✉️ Email : ${to}</div>
        <div style="font-size: 14px; color: #555; margin: 8px 0;">👤 Nom d'utilisateur : ${username}</div>
        <div style="font-size: 14px; color: #555; margin: 8px 0;">🏢 ${accountType === 'Client' ? 'Entreprise' : 'Cabinet'} : ${firmName}</div>
      </div>
      <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px; text-align: center;">
        <strong style="color: #856404; display: block; margin-bottom: 15px;">🔐 Votre mot de passe temporaire :</strong>
        <div style="font-size: 24px; font-weight: 700; color: #1976d2; background-color: white; padding: 15px 25px; border-radius: 8px; letter-spacing: 2px; display: inline-block;">${password}</div>
      </div>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
        <p style="font-size: 13px; color: #856404; margin: 5px 0;"><strong>⚠️ Important :</strong> Changez ce mot de passe dès votre première connexion</p>
      </div>
      <center><a href="${frontendUrl}/login" style="display: inline-block; margin: 25px 0; padding: 16px 48px; background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Se connecter à FINORA</a></center>
    `
    );
    await this.sendEmail(to, `🎉 Bienvenue sur FINORA - Votre compte ${accountType}`, html);
  }

  async sendAccountActivationEmail(to: string, firstName: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    const html = this.getEmailTemplate(
      'Votre compte a été activé !',
      `
      <div style="text-align: center; font-size: 64px; margin-bottom: 20px;">✅</div>
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour ${firstName},</p>
      <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-left: 4px solid #4caf50; padding: 20px; margin: 25px 0; border-radius: 4px;">
        <p style="color: #2e7d32; font-weight: 500;">🎉 Bonne nouvelle ! Votre compte a été activé.</p>
      </div>
      <center><a href="${frontendUrl}/login" style="display: inline-block; margin: 25px 0; padding: 16px 48px; background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Accéder à mon compte</a></center>
    `
    );
    await this.sendEmail(to, '✅ Votre compte FINORA a été activé', html);
  }

  async sendAccountSuspensionEmail(to: string, firstName: string, reason?: string): Promise<void> {
    const html = this.getEmailTemplate(
      'Compte Suspendu',
      `
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour ${firstName},</p>
      <p style="font-size: 15px; color: #666; margin-bottom: 15px;">Votre compte a été suspendu par l'administrateur.</p>
      ${reason ? `<div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 20px; margin: 25px 0; border-radius: 4px;"><strong style="color: #c62828;">Raison :</strong> ${reason}</div>` : ''}
      <p style="font-size: 15px; color: #666;">Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur.</p>
    `
    );
    await this.sendEmail(to, 'Votre compte FINORA a été suspendu', html);
  }

  private getEmailTemplate(title: string, content: string): string {
    const year = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0f2f5; padding: 40px 20px; line-height: 1.6; margin: 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background-color: #f8f9fa; padding: 40px 20px; text-align: center;">
              <img src="cid:logo@finora" alt="FINORA" style="max-width: 180px; height: auto; display: inline-block;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 50px 40px;">
              <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; text-align: center;">${title}</h1>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center;">
              <table role="presentation" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://facebook.com" style="display: inline-block; text-decoration: none;">
                      <img src="cid:facebook@finora" alt="Facebook" style="width: 32px; height: 32px; display: block;" />
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://instagram.com" style="display: inline-block; text-decoration: none;">
                      <img src="cid:instagram@finora" alt="Instagram" style="width: 32px; height: 32px; display: block;" />
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://linkedin.com" style="display: inline-block; text-decoration: none;">
                      <img src="cid:linkedin@finora" alt="LinkedIn" style="width: 32px; height: 32px; display: block;" />
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #999999; margin: 0;">Copyright © ${year} FINORA - All rights reserved</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
