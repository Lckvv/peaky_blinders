import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authFromCookie, generateApiKey } from '@/lib/auth';

// GET — list user's API keys (web dashboard)
export async function GET() {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        key: true,
        label: true,
        active: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('[ApiKey GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — generate new API key
export async function POST(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { label } = await request.json().catch(() => ({ label: null }));

    // Limit: max 5 active keys per user
    const activeCount = await prisma.apiKey.count({
      where: { userId: user.id, active: true },
    });

    if (activeCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 active API keys allowed. Deactivate one first.' },
        { status: 400 }
      );
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        key: generateApiKey(),
        label: label || `Key #${activeCount + 1}`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      key: apiKey.key,
      id: apiKey.id,
      label: apiKey.label,
      message: 'Copy this key into your Tampermonkey script CONFIG.API_KEY',
    });
  } catch (error) {
    console.error('[ApiKey POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE — deactivate an API key
export async function DELETE(request: NextRequest) {
  try {
    const user = await authFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await request.json();

    await prisma.apiKey.updateMany({
      where: { id: keyId, userId: user.id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ApiKey DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
