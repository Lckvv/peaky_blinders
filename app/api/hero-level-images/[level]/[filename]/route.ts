import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const ALLOWED_LEVELS = [64, 83, 114, 144, 217, 300];
const ALLOWED_EXT = ['.gif', '.png', '.webp'];
// Pliki w podfolderach: hero-level-images/heroes/64/hero.gif, 83/hero.png itd.
const HEROES_BASE = path.join(process.cwd(), 'app', 'api', 'hero-level-images', 'heroes');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ level: string; filename: string }> }
) {
  const { level, filename } = await params;
  const levelNum = level ? parseInt(level, 10) : NaN;
  if (!Number.isInteger(levelNum) || !ALLOWED_LEVELS.includes(levelNum)) {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const filePath = path.join(HEROES_BASE, level, filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const buffer = readFileSync(filePath);
    const contentType =
      ext === '.gif' ? 'image/gif' : ext === '.png' ? 'image/png' : 'image/webp';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
