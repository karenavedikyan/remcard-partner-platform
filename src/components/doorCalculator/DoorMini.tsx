export function DoorMini({
  color = '#d9d4ca',
  glass = false,
  plus = false,
}: {
  color?: string;
  glass?: boolean;
  plus?: boolean;
}) {
  if (plus) {
    return (
      <svg className="mdoor" viewBox="0 0 60 84" aria-hidden>
        <rect
          x="13"
          y="5"
          width="34"
          height="74"
          rx="2"
          fill="none"
          style={{ stroke: 'var(--muted)' }}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M30 34v16M22 42h16"
          style={{ stroke: 'var(--primary)' }}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className="mdoor" viewBox="0 0 60 84" aria-hidden>
      <rect x="10" y="2" width="40" height="80" rx="2" fill="#e8d2aa" stroke="#00000022" />
      <rect x="14" y="6" width="32" height="76" fill={color} stroke="#00000035" />
      <rect
        x="19"
        y="12"
        width="22"
        height="28"
        fill={glass ? '#cfe3ea' : '#ffffff18'}
        stroke="#00000020"
      />
      <rect x="19" y="46" width="22" height="28" fill="#ffffff18" stroke="#00000020" />
      <rect x="38" y="42" width="6" height="2.4" rx="1.2" fill="#2a2b29" />
    </svg>
  );
}