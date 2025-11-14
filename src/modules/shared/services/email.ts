import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('SMTP configuration missing; emails will be logged only');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: !!env.SMTP_SECURE, // false for 587/2525 (STARTTLS)
    requireTLS: !!env.SMTP_REQUIRE_TLS,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    tls: {
      minVersion: 'TLSv1.2'
    }
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const from = `${env.BREVO_SENDER_NAME || 'MySchoolBus'} <${env.BREVO_SENDER_EMAIL || 'no-reply@myschoolbus.local'}>`;
  const t = getTransporter();
  if (!t) {
    logger.info({ to, subject }, 'email_logged_only');
    return;
  }
  try {
    await t.sendMail({ from, to, subject, html });
  } catch (err) {
    logger.error({ err }, 'email_send_failed');
    throw new Error('email_send_failed');
  }
}
