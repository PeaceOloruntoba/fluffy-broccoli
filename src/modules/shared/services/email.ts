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
  // Build transport options explicitly to control STARTTLS / direct TLS.
  const transportOptions = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: !!env.SMTP_SECURE, // true = use TLS on connect (usually port 465)
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    // If true, forces STARTTLS (upgrade) for non-TLS ports (e.g., 587/2525)
    requireTLS: !!env.SMTP_REQUIRE_TLS,
    // TLS options: keep strict by default, but allow override for debugging.
    tls: {
      // When false, allows self-signed/untrusted certs (not recommended in prod)
      rejectUnauthorized: !!env.SMTP_TLS_REJECT_UNAUTHORIZED,
      // ensure a modern TLS version
      minVersion: 'TLSv1.2',
    },
    // Helpful for debugging connection/TLS issues; enabled via env.
    logger: !!env.SMTP_DEBUG,
    debug: !!env.SMTP_DEBUG,
  };

  logger.info({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: !!env.SMTP_SECURE, requireTLS: !!env.SMTP_REQUIRE_TLS, debug: !!env.SMTP_DEBUG }, 'smtp_transport_options');

  // cast to any because typings for nodemailer transports can vary by version
  transporter = nodemailer.createTransport(transportOptions as any);
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
