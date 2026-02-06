import { prisma } from './prisma';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-please'
);

// ==================== PASSWORD ====================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ==================== JWT ====================

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

// ==================== API KEY AUTH (for Tampermonkey) ====================

export async function validateApiKey(apiKey: string) {
  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey, active: true },
    include: { user: true },
  });

  if (!key) return null;

  // Update last used timestamp (fire and forget)
  prisma.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    })
    .catch(() => {});

  return key.user;
}

export function generateApiKey(): string {
  return [
    'mgt', // prefix: margonem-timer
    crypto.randomUUID().replace(/-/g, ''),
  ].join('_');
}

// ==================== REQUEST AUTH HELPERS ====================

/**
 * Auth from API key header (Tampermonkey script)
 * Header: X-API-Key: mgt_xxxxx
 */
export async function authFromApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;
  return validateApiKey(apiKey);
}

/**
 * Auth from JWT cookie (web dashboard)
 * Cookie: token=eyJhbG...
 */
export async function authFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return prisma.user.findUnique({
    where: { id: payload.userId },
  });
}

/**
 * Universal auth — tries API key first, then cookie
 */
export async function authenticate(request: NextRequest) {
  // 1. Try API key (Tampermonkey)
  const apiKeyUser = await authFromApiKey(request);
  if (apiKeyUser) return { user: apiKeyUser, method: 'api_key' as const };

  // 2. Try JWT cookie (web)
  const cookieUser = await authFromCookie();
  if (cookieUser) return { user: cookieUser, method: 'cookie' as const };

  return null;
}
