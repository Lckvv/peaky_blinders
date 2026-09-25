type RoleMap = Record<string, string>;

const HEROS_PING_MAP: RoleMap = {
  'Wicked Patrick': '@Mroczny Patryk',
  'Crimson Avenger': '@Karmazynowy Mściciel',
  Thief: '@Złodziej',
  'Spiteful Guide': '@Zły Przewodnik',
  'Possessed Paladin': '@Opętany Paladyn',
  'Hellish Skeletor': '@Piekielny Kościej',
  'Grove Sentinel': '@Koziec Mąciciel Ścieżek',
  "Night's Mistress": '@Kochanka Nocy',
  'Prince Kasim': '@Książe Kasim',
  'Pious Friar': '@Święty Braciszek',
  'Golden Roger': '@Złoty Roger',
  'Sheepless Shepherd': '@Baca bez Łowiec',
  'Spellcaster Atalia': '@Czarująca Atalia',
  'Insane Orc Hunter': '@Obłąkany Łowca Orków',
  'Usurer Grauhaz': '@Lichwiarz Grauhaz',
  'Viviana Nandin': '@Viviana Nandin',
  Frightener: '@Przeraza',
  'Demonis Lord of the Void': '@Demonis Pan Nicości',
  'Mulher Ma': '@Mulher Ma',
  'Vapor Veneno': '@Vapor Veneno',
  Oakhornus: '@Dęborożec',
  Tepeyollotl: '@Tepeyollotl',
  'Triad Specter': '@Widmo Triady',
  'Negthotep the Abyss Priest': '@Negthotep Czarny Kapłan',
  'Young Dragon': '@Młody Smok',
};

const TITAN_PING_MAP: RoleMap = {
  'Virgin Eagless': '@Dziewicza Orlica',
  'Killer Rabbit': '@Zabójczy Królik',
  'Renegade Baulus': '@Renegat Baulus',
  'Infernal Archmage': '@Piekielny Arcymag',
  'Versus Zoons': '@Versus Zoons',
  'Huntress of Memories': '@Łowczyni Wspomnień',
  'Daemons Summoner': '@Przyzywacz Demonów',
  'Maddok Magua': '@Maddok Magua',
  Tezcatlipoca: '@Tezcatlipoca',
  'Dragon Guardian Barbatos': '@Barbatos Smoczy Strażnik',
  Tanroth: '@Tanroth',
};

const HEROS_DISCORD_ROLE_IDS: RoleMap = {
  'Wicked Patrick': '1472308873837674755',
  'Crimson Avenger': '1472308934025941094',
  Thief: '1472308994977829068',
  'Spiteful Guide': '1472309048388096243',
  'Possessed Paladin': '1472309150946951248',
  'Hellish Skeletor': '1472309197453393980',
  'Grove Sentinel': '1472309289996521675',
  "Night's Mistress": '1471916507297484905',
  'Prince Kasim': '1471916577728233574',
  'Pious Friar': '1471916606228664336',
  'Golden Roger': '1471916626336026835',
  'Sheepless Shepherd': '1471916650025717995',
  'Spellcaster Atalia': '1471916679297630310',
  'Insane Orc Hunter': '1471916718795522059',
  'Usurer Grauhaz': '1471916737887994098',
  'Viviana Nandin': '1471917686337441934',
  Frightener: '1471916771392094374',
  'Demonis Lord of the Void': '1471916812185763840',
  'Mulher Ma': '1471916847736684708',
  'Vapor Veneno': '1471916953848512604',
  Oakhornus: '1471916979752407101',
  Tepeyollotl: '1471917002166767668',
  'Triad Specter': '1471917021200650516',
  'Negthotep the Abyss Priest': '1471917052242559059',
  'Young Dragon': '1471917079190831258',
};

const TITAN_DISCORD_ROLE_IDS: RoleMap = {
  'Virgin Eagless': '725114797875789926',
  'Killer Rabbit': '725114855698202656',
  'Renegade Baulus': '725114894034272317',
  'Infernal Archmage': '725114977656242247',
  'Versus Zoons': '725115162398294047',
  'Huntress of Memories': '780724987551023134',
  'Daemons Summoner': '725115268182835281',
  'Maddok Magua': '952532626760151050',
  Tezcatlipoca: '780726825575383111',
  'Dragon Guardian Barbatos': '1109961353784995973',
  Tanroth: '780726964830732319',
};

export const HERO_CALL_LEVELS = [63, 83, 114, 144, 167, 190, 217, 244, 271, 300];
export const HERO_CALL_LEVEL_RANGE = 13;
const HERO_CALL_LEVEL_RANGE_UP: Record<number, number> = { 300: 200 };

export function heroCallLevelRange(level: number): { lo: number; hi: number } {
  return {
    lo: level - HERO_CALL_LEVEL_RANGE,
    hi: level + (HERO_CALL_LEVEL_RANGE_UP[level] ?? HERO_CALL_LEVEL_RANGE),
  };
}

export function sanitizeDiscordText(value: string, max = 120): string {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/@/g, '＠')
    .replace(/`/g, "'")
    .trim()
    .slice(0, max);
}

function lookupPing(name: string, pingMap: RoleMap): string {
  const lower = name.trim().toLowerCase();
  for (const k of Object.keys(pingMap)) {
    if (k.toLowerCase() === lower) return pingMap[k];
  }
  return '@here';
}

function lookupRoleMention(name: string, roleIds: RoleMap, pingMap: RoleMap): string {
  const lower = name.trim().toLowerCase();
  for (const k of Object.keys(roleIds)) {
    if (k.toLowerCase() === lower) {
      const id = String(roleIds[k] || '').trim();
      if (id) return `<@&${id}>`;
    }
  }
  return lookupPing(name, pingMap);
}

export function getMonsterMention(kind: 'hero' | 'titan', nick: string): string {
  if (!nick || typeof nick !== 'string') return '@here';
  return kind === 'titan'
    ? lookupRoleMention(nick, TITAN_DISCORD_ROLE_IDS, TITAN_PING_MAP)
    : lookupRoleMention(nick, HEROS_DISCORD_ROLE_IDS, HEROS_PING_MAP);
}

export function isAllowedDiscordImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return (
      host === 'micc.garmory-cdn.cloud' ||
      host.endsWith('.garmory-cdn.cloud') ||
      host.endsWith('.railway.app')
    );
  } catch {
    return false;
  }
}

function webhookFor(kind: 'hero' | 'titan'): string {
  const fromEnv = kind === 'titan' ? process.env.DISCORD_WEBHOOK_TITAN : process.env.DISCORD_WEBHOOK_HEROS;
  return String(fromEnv || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

export async function sendClanDiscordMessage(opts: {
  kind: 'hero' | 'titan';
  content: string;
  imageUrl?: string | null;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const webhook = webhookFor(opts.kind);
  if (!webhook || !webhook.startsWith('https://discord.com/api/webhooks/')) {
    return { ok: false, status: 503, error: 'Discord webhook is not configured' };
  }

  const payload: {
    content: string;
    allowed_mentions: { parse: string[] };
    embeds?: { thumbnail: { url: string } }[];
  } = {
    content: opts.content,
    allowed_mentions: { parse: ['everyone', 'roles'] },
  };
  if (opts.imageUrl && isAllowedDiscordImageUrl(opts.imageUrl)) {
    payload.embeds = [{ thumbnail: { url: opts.imageUrl } }];
  }

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}
