import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromApiKey } from '@/lib/auth';

/**
 * POST /api/timer/chat-log — zapisz w logach wiadomość prywatną z czatu (author, receiver, text, messageTime).
 * Nagłówek X-API-Key. createdAt ustawiane po stronie serwera.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authFromApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const author = typeof body?.author === 'string' ? body.author.trim() : '';
    const receiver = typeof body?.receiver === 'string' ? body.receiver.trim() : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const messageTime = typeof body?.messageTime === 'string' ? body.messageTime.trim() : null;

    if (!author || !text) {
      return NextResponse.json(
        { error: 'author and text are required' },
        { status: 400 }
      );
    }

    await prisma.chatLog.create({
      data: {
        userId: user.id,
        author,
        receiver: receiver || '',
        text,
        messageTime: messageTime || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/timer/chat-log]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
