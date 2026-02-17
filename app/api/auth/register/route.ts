import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createToken, generateApiKey } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, nick, invitationCode } = await request.json();

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username and password are required' },
        { status: 400 }
      );
    }

    if (!invitationCode || typeof invitationCode !== 'string' || !invitationCode.trim()) {
      return NextResponse.json(
        { error: 'Kod zaproszenia jest wymagany do rejestracji' },
        { status: 400 }
      );
    }

    const codeTrimmed = invitationCode.trim();

    // Znajdź i zweryfikuj kod zaproszenia (jednorazowy)
    const invCode = await prisma.invitationCode.findUnique({
      where: { code: codeTrimmed },
    });
    if (!invCode) {
      return NextResponse.json(
        { error: 'Nieprawidłowy kod zaproszenia' },
        { status: 400 }
      );
    }
    if (invCode.usedAt != null) {
      return NextResponse.json(
        { error: 'Ten kod zaproszenia został już wykorzystany' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.email === email
              ? 'Email already registered'
              : 'Username already taken',
        },
        { status: 409 }
      );
    }

    // Create user + first API key + dezaktywuj kod zaproszenia w jednej transakcji
    const { user, apiKey } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username,
          password: await hashPassword(password),
          nick: nick || null,
        },
      });

      const apiKey = await tx.apiKey.create({
        data: {
          key: generateApiKey(),
          label: 'Default key',
          userId: user.id,
        },
      });

      await tx.invitationCode.update({
        where: { id: invCode.id },
        data: { usedAt: new Date(), usedById: user.id },
      });

      return { user, apiKey };
    });

    // Create JWT token
    const token = await createToken(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      apiKey: apiKey.key, // Show once at registration!
      message:
        'Account created! Copy your API key and paste it into the Tampermonkey script.',
    });

    // Set cookie for web dashboard
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('[Register] Error:', message, stack);
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { detail: message }),
      },
      { status: 500 }
    );
  }
}
