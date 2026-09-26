import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

export const SCRIPT_VERSION = '2.18';

export const SCRIPT_PATH = join(process.cwd(), 'tampermonkey-map-timer.user.js');

let cachedHash: string | null = null;

export function getScriptSha256(): string {
  if (!cachedHash) {
    cachedHash = createHash('sha256').update(readFileSync(SCRIPT_PATH)).digest('hex');
  }
  return cachedHash;
}
