import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const ALLOWED_EXT = ['.gif', '.png'];
// Obrazy w: app/api/titans-images/kic/[filename]/titans_images/kic/
const KIC_DIR = path.join(process.cwd(), 'app', 'api', 'titans-images', 'kic', '[filename]', 'titans_images', 'kic');

// GET /api/titans-images/kic/[filename] — serwuje pliki z lib/titans_images/kic
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let filePath = path.join(KIC_DIR, filename);
  if (!existsSync(filePath)) {
    // Fallback: pliki mogą mieć spację zamiast podkreślenia (np. "pier mag.gif")
    const base = path.basename(filename, ext);
    const altName = base.replace(/_/g, ' ') + ext;
    const altPath = path.join(KIC_DIR, altName);
    if (existsSync(altPath)) filePath = altPath;
    else return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
