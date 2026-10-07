/**
 * tone: default | warn | danger | ai
 * value가 null이면 placeholder(—)와 hint를 보여줍니다.
 */
export default function StatCard({ label, value, unit, tone = 'default', hint }) {
  const empty = value === null || value === undefined;
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {empty ? '—' : value}
        {!empty && unit && <small>{unit}</small>}
      </span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
