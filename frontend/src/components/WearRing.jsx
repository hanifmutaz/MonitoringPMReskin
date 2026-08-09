// src/components/WearRing.jsx
const SIZE = 44;
const RADIUS = 17;
const STROKE = 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_COLOR_VAR = { OK: '--ok', WARNING: '--warn', DANGER: '--danger' };

function WearRing({ percentage, status }) {
  const clamped = Math.max(0, Math.min(percentage, 100));
  const colorVar = STATUS_COLOR_VAR[status] || '--text-faint';
  const dash = (clamped / 100) * CIRCUMFERENCE;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--panel-3)" strokeWidth={STROKE} />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={`var(${colorVar})`}
        strokeWidth={STROKE}
        strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-mono)"
        fontSize="10"
        fill={`var(${colorVar})`}
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

export default WearRing;
