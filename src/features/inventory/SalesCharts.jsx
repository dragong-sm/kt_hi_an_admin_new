import EmptyState from '../../components/EmptyState';
import LineForecastChart from '../../components/charts/LineForecastChart';
import DonutChart from '../../components/charts/DonutChart';

/**
 * 판매 그래프 2개 — 판매 데이터 API가 아직 없어 "데이터 없음"으로 표시합니다.
 * sales: { daily: [{ label, actual, forecast }], menu_share: [{ name, ratio }], period_label } | null
 * (판매 API가 연결되면 InventoryPage에서 sales를 넘기면 그대로 그려집니다.)
 */
export default function SalesCharts({ sales = null }) {
  const daily = sales?.daily ?? [];
  const share = sales?.menu_share ?? [];
  return (
    <div className="chart-grid">
      <section className="card chart-card" aria-labelledby="sales-trend-title">
        <div className="chart-head">
          <h2 id="sales-trend-title">일별 판매량</h2>
          {daily.length > 0 && (
            <ul className="chart-legend" aria-label="범례">
              <li><span className="legend-line" aria-hidden="true" />실제</li>
              <li><span className="legend-line is-forecast" aria-hidden="true" />AI 예상</li>
            </ul>
          )}
        </div>
        {daily.length > 0 ? <LineForecastChart data={daily} /> : <EmptyState title="데이터 없음" description="판매 데이터가 연동되면 표시됩니다." />}
      </section>
      <section className="card chart-card" aria-labelledby="menu-share-title">
        <div className="chart-head">
          <h2 id="menu-share-title">메뉴별 판매 비중</h2>
          {sales?.period_label && <span className="card-note">{sales.period_label}</span>}
        </div>
        {share.length > 0 ? (
          <DonutChart data={share} centerTop="판매 비중" centerBottom={sales?.period_label || ''} />
        ) : (
          <EmptyState title="데이터 없음" description="판매 데이터가 연동되면 표시됩니다." />
        )}
      </section>
    </div>
  );
}
