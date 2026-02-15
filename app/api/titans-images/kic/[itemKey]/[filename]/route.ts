import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const ALLOWED_EXT = ['.gif', '.png'];
// Obrazy w podfolderach: app/api/titans-images/kic/{itemKey}/{filename}, np. kic/pier_mag/pierscien884.gif
const KIC_BASE = path.join(process.cwd(), 'app', 'api', 'titans-images', 'kic');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemKey: string; filename: string }> }
) {
  const { itemKey, filename } = await params;
  if (!itemKey || !filename || itemKey.includes('..') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const filePath = path.join(KIC_BASE, itemKey, filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const buffer = readFileSync(filePath);
    const contentType = ext === '.gif' ? 'image/gif' : 'image/png';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
