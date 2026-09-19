import nodemailer from 'nodemailer';
import type { MailConfig } from './email-settings';

export function isMailConfigured(config: MailConfig | null): config is MailConfig {
  return Boolean(config?.host && config.fromEmail);
}

function createTransport(config: MailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.password
        ? { user: config.user, pass: config.password }
        : undefined,
  });
}

export async function sendMail(
  config: MailConfig,
  options: { to: string; subject: string; html: string; text: string }
) {
  const transporter = createTransport(config);
  await transporter.sendMail({
    from: `"${config.fromName.replace(/"/g, '')}" <${config.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function verifyMailTransport(config: MailConfig) {
  const transporter = createTransport(config);
  await transporter.verify();
}

export function passwordResetEmail(params: {
  username: string;
  resetUrl: string;
  fromName: string;
}) {
  const { username, resetUrl, fromName } = params;
  const subject = `${fromName} — reset hasła`;
  const text = [
    `Cześć ${username},`,
    '',
    'Otrzymaliśmy prośbę o reset hasła do Twojego konta.',
    `Otwórz ten link, aby ustawić nowe hasło (ważny 1 godzinę):`,
    resetUrl,
    '',
    'Jeśli to nie Ty, zignoruj tę wiadomość — hasło pozostanie bez zmian.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="pl">
  <body style="margin:0;padding:0;background:#07080f;color:#e8ecf4;font-family:Georgia,serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07080f;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#12141f;border:1px solid #c9a22744;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;text-align:center;">
                <p style="margin:0;letter-spacing:0.28em;text-transform:uppercase;font-size:11px;color:#c9a227;">Guardians of Souls</p>
                <h1 style="margin:12px 0 0;font-size:22px;color:#f3e6b8;">Reset hasła</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;font-size:15px;line-height:1.6;color:#cfd6e4;">
                <p>Cześć <strong style="color:#fff;">${escapeHtml(username)}</strong>,</p>
                <p>Ktoś poprosił o przypomnienie hasła do Twojego konta. Kliknij przycisk poniżej, aby ustawić nowe. Link wygasa po godzinie.</p>
                <p style="text-align:center;margin:28px 0;">
                  <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#c9a227,#e8d48b);color:#1a1408;text-decoration:none;font-weight:700;border-radius:999px;">Ustaw nowe hasło</a>
                </p>
                <p style="font-size:12px;color:#8b93a7;">Jeśli przycisk nie działa, wklej ten adres w przeglądarkę:<br/>${escapeHtml(resetUrl)}</p>
                <p style="font-size:12px;color:#8b93a7;margin-bottom:0;">Jeśli to nie Ty, zignoruj tę wiadomość.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
