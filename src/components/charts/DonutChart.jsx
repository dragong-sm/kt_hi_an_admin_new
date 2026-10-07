/**
 * 메뉴별 판매량 비중 (SVG Donut Chart)
 * data: [{ name, ratio }]  (ratio 합계 100 기준)
 */
export const DONUT_COLORS = ['var(--mint)', 'var(--charcoal)', 'var(--mist)', '#7fdcd1', '#a9b4b1'];

const R = 54;
const STROKE = 22;
const C = 2 * Math.PI * R;

export default function DonutChart({ data, centerTop, centerBottom }) {
  const total = data.reduce((s, d) => s + d.ratio, 0) || 1;
  const segments = data.map((d, i) => {
    const before = data.slice(0, i).reduce((s, x) => s + x.ratio, 0);
    return { ...d, len: (C * d.ratio) / total, offset: (C * before) / total, color: DONUT_COLORS[i % DONUT_COLORS.length] };
  });

  return (
    <div className="donut">
      <svg viewBox="0 0 150 150" role="img" aria-label={`메뉴별 판매 비중: ${data.map((d) => `${d.name} ${d.ratio}%`).join(', ')}`}>
        <g transform="rotate(-90 75 75)">
          {segments.map((s) => (
            <circle
              key={s.name}
              cx="75"
              cy="75"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.offset}
            >
              <title>{`${s.name} ${s.ratio}%`}</title>
            </circle>
          ))}
        </g>
        <text className="donut-center-top" x="75" y="71" textAnchor="middle">
          {centerTop}
        </text>
        <text className="donut-center-bottom" x="75" y="90" textAnchor="middle">
          {centerBottom}
        </text>
      </svg>
      <ul className="donut-legend">
        {segments.map((s) => (
          <li key={s.name}>
            <span className="legend-swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="legend-name">{s.name}</span>
            <strong>{s.ratio}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
