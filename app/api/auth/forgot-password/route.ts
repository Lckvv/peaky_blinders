import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMailConfig, originFromRequest, resolveAppUrl } from '@/lib/email-settings';
import { isMailConfigured, passwordResetEmail, sendMail } from '@/lib/mail';

const TOKEN_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const login = typeof body.login === 'string' ? body.login.trim() : '';

    if (!login) {
      return NextResponse.json({ error: 'Podaj email lub nazwę użytkownika' }, { status: 400 });
    }

    const config = await getMailConfig();
    if (!isMailConfigured(config)) {
      return NextResponse.json(
        {
          error:
            'Przypomnienie hasła nie jest jeszcze skonfigurowane. Poproś administratora o ustawienie poczty SMTP.',
        },
        { status: 503 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: login }, { username: login }] },
    });

    const okMessage =
      'Jeśli konto istnieje, wysłaliśmy wiadomość z linkiem do resetu hasła. Sprawdź skrzynkę (oraz folder spam).';

    if (!user) {
      return NextResponse.json({ message: okMessage });
    }

    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && !recent.usedAt) {
      return NextResponse.json({ message: okMessage });
    }

    const rawToken = randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const origin = resolveAppUrl(originFromRequest(request), config.appUrl);
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;
    const email = passwordResetEmail({
      username: user.username,
      resetUrl,
      fromName: config.fromName,
    });

    await sendMail(config, {
      to: user.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    return NextResponse.json({ message: okMessage });
  } catch (error) {
    console.error('[Forgot password] Error:', error);
    return NextResponse.json(
      { error: 'Nie udało się wysłać wiadomości. Sprawdź konfigurację SMTP.' },
      { status: 500 }
    );
  }
}
