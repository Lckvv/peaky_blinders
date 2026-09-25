import { NextResponse } from 'next/server';
import { SCRIPT_VERSION, getScriptSha256 } from '@/lib/script-meta';

export const dynamic = 'force-dynamic';

// GET /api/script/version
// Publiczne: wersja i SHA-256 pliku skryptu, ktory serwer aktualnie wydaje (przed wstawieniem klucza API).
export async function GET() {
  try {
    return NextResponse.json(
      { version: SCRIPT_VERSION, sha256: getScriptSha256() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Script file not found' }, { status: 404 });
  }
}
