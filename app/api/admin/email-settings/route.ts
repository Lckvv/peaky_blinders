import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie } from '@/lib/auth';
import { getMailConfig, getPublicEmailSettings } from '@/lib/email-settings';
import { isMailConfigured, sendMail, verifyMailTransport } from '@/lib/mail';

function canManage(role: string) {
  return role === 'admin' || role === 'super_admin';
}

export async function GET() {
  try {
    const user = await authFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManage(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const settings = await getPublicEmailSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('GET /api/admin/email-settings', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManage(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const smtpHost = typeof body.smtpHost === 'string' ? body.smtpHost.trim() : '';
    const smtpPort = Number(body.smtpPort);
    const smtpSecure = Boolean(body.smtpSecure);
    const smtpUser = typeof body.smtpUser === 'string' ? body.smtpUser.trim() : '';
    const smtpPassword = typeof body.smtpPassword === 'string' ? body.smtpPassword : '';
    const fromEmail = typeof body.fromEmail === 'string' ? body.fromEmail.trim() : '';
    const fromName = typeof body.fromName === 'string' ? body.fromName.trim() : 'Guardians of Souls';
    const appUrl = typeof body.appUrl === 'string' ? body.appUrl.trim() : '';

    if (!Number.isFinite(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return NextResponse.json({ error: 'Nieprawidłowy port SMTP' }, { status: 400 });
    }

    const existing = await prisma.emailSettings.findUnique({ where: { id: 'default' } });
    const data: {
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUser: string;
      fromEmail: string;
      fromName: string;
      appUrl: string;
      smtpPassword?: string;
    } = {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      fromEmail,
      fromName: fromName || 'Guardians of Souls',
      appUrl,
    };

    if (smtpPassword.trim()) {
      data.smtpPassword = smtpPassword;
    } else if (!existing) {
      data.smtpPassword = '';
    }

    await prisma.emailSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data, smtpPassword: data.smtpPassword ?? '' },
      update: data,
    });

    const settings = await getPublicEmailSettings();
    return NextResponse.json({ settings, message: 'Zapisano konfigurację poczty.' });
  } catch (error) {
    console.error('PUT /api/admin/email-settings', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManage(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const to = typeof body.to === 'string' ? body.to.trim() : user.email;

    const config = await getMailConfig();
    if (!isMailConfigured(config)) {
      return NextResponse.json(
        { error: 'Najpierw zapisz host SMTP i adres nadawcy.' },
        { status: 400 }
      );
    }

    await verifyMailTransport(config);
    await sendMail(config, {
      to,
      subject: `${config.fromName} — test poczty`,
      text: 'To jest wiadomość testowa. Konfiguracja SMTP działa poprawnie.',
      html: `<p>To jest wiadomość testowa z <strong>Guardians of Souls</strong>.</p><p>Konfiguracja SMTP działa poprawnie.</p>`,
    });

    return NextResponse.json({ message: `Wysłano test na ${to}` });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('POST /api/admin/email-settings', error);
    return NextResponse.json(
      { error: 'Nie udało się wysłać testu', detail },
      { status: 500 }
    );
  }
}
