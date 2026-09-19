export type PodiumEntry = {
  nick?: string | null;
  username: string;
  avatarUrl?: string | null;
  score: string;
  tone?: 'time' | 'points';
};

function Avatar({ url, place }: { url?: string | null; place: 1 | 2 | 3 }) {
  return (
    <div className={`gos-podium__frame gos-podium__frame--${place}`}>
      {url ? (
        <div className="gos-podium__avatar">
          <img src={url} alt="" />
        </div>
      ) : (
        <div className="gos-podium__avatar gos-podium__avatar--empty" />
      )}
    </div>
  );
}

function Column({ place, entry }: { place: 1 | 2 | 3; entry: PodiumEntry }) {
  return (
    <div className={`gos-podium__col gos-podium__col--${place}`}>
      <div className="gos-podium__player">
        {place === 1 && (
          <span className="gos-podium__crown" aria-hidden="true">
            <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
              <path
                d="M3 15.5 5.2 6.2 10.4 11 14 3.5 17.6 11 22.8 6.2 25 15.5H3Z"
                fill="#f0d78a"
                stroke="#b8892d"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        <Avatar url={entry.avatarUrl} place={place} />
        <span className="gos-podium__nick">{entry.nick || entry.username}</span>
        <span className={`gos-podium__score${entry.tone === 'points' ? ' gos-podium__score--points' : ''}`}>
          {entry.score}
        </span>
      </div>
      <div className="gos-podium__step">
        <span className="gos-podium__place">{place}</span>
      </div>
    </div>
  );
}

export default function Podium({ entries }: { entries: PodiumEntry[] }) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  if (!first) return null;

  return (
    <div className="gos-podium" aria-label="Podium">
      {third && <Column place={3} entry={third} />}
      <Column place={1} entry={first} />
      {second && <Column place={2} entry={second} />}
    </div>
  );
}
