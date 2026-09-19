import { prisma } from './prisma';

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  appUrl: string;
};

export type PublicEmailSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromEmail: string;
  fromName: string;
  appUrl: string;
  passwordSet: boolean;
  configured: boolean;
};

function envPort(): number {
  const n = Number(process.env.SMTP_PORT);
  return Number.isFinite(n) && n > 0 ? n : 587;
}

export async function getMailConfig(): Promise<MailConfig | null> {
  const row = await prisma.emailSettings.findUnique({ where: { id: 'default' } });

  const host = (row?.smtpHost || process.env.SMTP_HOST || '').trim();
  const fromEmail = (row?.fromEmail || process.env.SMTP_FROM || '').trim();
  const user = (row?.smtpUser || process.env.SMTP_USER || '').trim();
  const password = (row?.smtpPassword || process.env.SMTP_PASS || '').trim();
  const fromName = (row?.fromName || process.env.SMTP_FROM_NAME || 'Guardians of Souls').trim();
  const appUrl = (row?.appUrl || process.env.APP_URL || '').trim();
  const port = row?.smtpPort && row.smtpPort > 0 ? row.smtpPort : envPort();
  const secure =
    row != null && (row.smtpHost || row.fromEmail)
      ? row.smtpSecure
      : process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !fromEmail) return null;

  return {
    host,
    port,
    secure,
    user,
    password,
    fromEmail,
    fromName: fromName || 'Guardians of Souls',
    appUrl,
  };
}

export async function getPublicEmailSettings(): Promise<PublicEmailSettings> {
  const row = await prisma.emailSettings.findUnique({ where: { id: 'default' } });
  const config = await getMailConfig();

  return {
    smtpHost: row?.smtpHost || process.env.SMTP_HOST || '',
    smtpPort: row?.smtpPort || envPort(),
    smtpSecure: row?.smtpSecure ?? (process.env.SMTP_SECURE === 'true'),
    smtpUser: row?.smtpUser || process.env.SMTP_USER || '',
    fromEmail: row?.fromEmail || process.env.SMTP_FROM || '',
    fromName: row?.fromName || process.env.SMTP_FROM_NAME || 'Guardians of Souls',
    appUrl: row?.appUrl || process.env.APP_URL || '',
    passwordSet: Boolean((row?.smtpPassword || process.env.SMTP_PASS || '').trim()),
    configured: Boolean(config),
  };
}

export function resolveAppUrl(requestOrigin: string, configAppUrl?: string): string {
  const fromConfig = (configAppUrl || '').trim();
  if (fromConfig) return fromConfig.replace(/\/$/, '');
  return requestOrigin.replace(/\/$/, '');
}

export function originFromRequest(request: { headers: Headers }): string {
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}
