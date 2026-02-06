import { NextResponse } from 'next/server';
import { authFromCookie, createToken } from '@/lib/auth';

// GET /api/script/install-token — returns a short-lived token for the install URL
export async function GET() {
  const user = await authFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized — log in first' }, { status: 401 });
  }

  // Create a short-lived token (reuse JWT but it's only used once for install)
  const token = await createToken(user.id);

  return NextResponse.json({ token });
}

