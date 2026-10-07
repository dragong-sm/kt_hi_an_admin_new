import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';
import { aiRecommendText, alertInfo, displayStockStatus, expiryInfo, formatQty } from '../../config/inventoryLabels';

const Analyzing = () => <span className="judgement-pending is-analyzing">분석중...</span>;
const Failed = () => <span className="muted">분석 실패</span>;

/**
 * RESOURCE 재고 목록 — 행 전체 클릭 시 onSelect(resource_id)
 * aiStatus: AI 분석 상태. 'success'가 아니면 재고 상태·AI 추천 칸은 분석 결과 대신 상태를 표시
 * 컬럼 너비는 고정(table-layout: fixed) — 분석중/결과 전환 시 표가 흔들리지 않음
 */
export default function ResourceTable({ resources, aiStatus, editedIds, onSelect }) {
  const aiCell = (render) => (aiStatus === 'loading' ? <Analyzing /> : aiStatus === 'error' ? <Failed /> : render());

  return (
    <div className="table-wrap">
      <table className="data-table resource-table">
        <colgroup>
          <col className="col-name" />
          <col className="col-qty" />
          <col className="col-exp" />
          <col className="col-status" />
          <col className="col-ai" />
          <col className="col-chevron" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">재료명</th>
            <th scope="col" className="num">현재 수량</th>
            <th scope="col">유통기한</th>
            <th scope="col">재고 상태</th>
            <th scope="col">AI 추천</th>
            <th scope="col"><span className="sr-only">상세</span></th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => {
            const exp = expiryInfo(r.expiration_date, r.days_to_expiry);
            const alert = alertInfo(r.alert_type);
            const aiText = aiRecommendText(r) || alert?.label || '';
            const status = displayStockStatus(r);
            return (
              <tr
                key={r.resource_id}
                className={`is-clickable${aiStatus === 'success' && status === 'SOLD_OUT' ? ' is-soldout' : ''}`}
                onClick={() => onSelect(r.resource_id)}
              >
                <th scope="row">
                  <span className="cell-line">
                    <button
                      type="button"
                      className="row-link cell-ellipsis"
                      title={r.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(r.resource_id);
                      }}
                    >
                      {r.name}
                      <span className="sr-only"> 재료 상세 보기</span>
                    </button>
                    {editedIds.has(r.resource_id) && <span className="chip chip-edited">수정됨</span>}
                  </span>
                </th>
                <td className="num cell-ellipsis">{formatQty(r.stock, r.unit)}</td>
                <td>
                  {r.expiration_date ? (
                    <span className="expiry">
                      {r.expiration_date}
                      {exp && <span className={`expiry-d tone-${exp.tone}`}>{exp.label}</span>}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{aiCell(() => (status ? <StatusBadge status={status} /> : <span className="muted">—</span>))}</td>
                <td>
                  {aiCell(() =>
                    aiText ? (
                      <span className={`judgement cell-ellipsis tone-${alert ? alert.tone : 'ok'}`} title={aiText}>
                        <Icon name="sparkle" size={13} strokeWidth={2} />
                        <span className="cell-ellipsis">{aiText}</span>
                      </span>
                    ) : (
                      <span className="muted">추천 없음</span>
                    ),
                  )}
                </td>
                <td aria-hidden="true">
                  <Icon name="chevron" size={16} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
