import { STOCK_STATUS } from '../config/inventoryLabels';

/** 상태 코드 → 한글 배지 (알 수 없는 코드는 영문 대신 '확인 필요') */
export default function StatusBadge({ status }) {
  if (!status) return null;
  const s = STOCK_STATUS[status] || { label: '확인 필요', tone: 'neutral' };
  return <span className={`badge badge-${s.tone}`}>{s.label}</span>;
}
