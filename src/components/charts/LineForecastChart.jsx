/**
 * 일별 판매량 + AI 예상 판매량 (SVG Line Chart)
 * data: [{ label, actual: number|null, forecast: number|null }]
 * 실제 = 차콜 실선, AI 예상 = 민트 점선 + 예측 구간 음영
 */
const W = 640;
const H = 230;
const PAD = { top: 26, right: 18, bottom: 30, left: 36 };

export default function LineForecastChart({ data }) {
  const values = data.flatMap((d) => [d.actual, d.forecast]).filter((v) => v != null);
  const yMax = Math.max(20, Math.ceil(Math.max(...values) / 20) * 20);
  const ticks = Array.from({ length: yMax / 20 + 1 }, (_, i) => i * 20);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
  const y = (v) => PAD.top + innerH - (innerH * v) / yMax;

  const actual = data.map((d, i) => ({ ...d, i })).filter((d) => d.actual != null);
  const lastActual = actual[actual.length - 1];
  const forecast = data.map((d, i) => ({ ...d, i })).filter((d) => d.forecast != null);
  const forecastPath = lastActual ? [{ i: lastActual.i, v: lastActual.actual }, ...forecast.map((d) => ({ i: d.i, v: d.forecast }))] : [];

  const toPoints = (pts) => pts.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const zoneStart = lastActual ? x(lastActual.i) : null;

  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="일별 판매량과 AI 예상 판매량 그래프">
      {zoneStart != null && forecast.length > 0 && (
        <g>
          <rect className="forecast-zone" x={zoneStart} y={PAD.top - 8} width={W - PAD.right - zoneStart} height={innerH + 8} rx="6" />
          <text className="forecast-label" x={(zoneStart + W - PAD.right) / 2} y={PAD.top + 6} textAnchor="middle">
            예측 구간
          </text>
        </g>
      )}

      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
          <text className="axis-label" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}

      {data.map((d, i) => (
        <text key={d.label} className="axis-label" x={x(i)} y={H - 8} textAnchor="middle">
          {d.label}
        </text>
      ))}

      <polyline className="line-actual" points={toPoints(actual.map((d) => ({ i: d.i, v: d.actual })))} />
      {forecastPath.length > 1 && <polyline className="line-forecast" points={toPoints(forecastPath)} />}

      {actual.map((d) => (
        <circle key={`a-${d.i}`} className="dot-actual" cx={x(d.i)} cy={y(d.actual)} r="4">
          <title>{`${d.label} 실제 판매량 ${d.actual}`}</title>
        </circle>
      ))}
      {forecast.map((d) => (
        <circle key={`f-${d.i}`} className="dot-forecast" cx={x(d.i)} cy={y(d.forecast)} r="4.5">
          <title>{`${d.label} AI 예상 판매량 ${d.forecast}`}</title>
        </circle>
      ))}
    </svg>
  );
}
