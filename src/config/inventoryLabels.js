/**
 * 재고관리 AI 코드 → 한글 표시 / 색 규칙
 * 재고 상태 tone: danger(빨강·폐기필요·품절) | caution(주황·부족예상) | good(초록·정상/충분)
 * 알림 tone: danger(빨강·긴급) | warn(파랑·주의) | info(회색·참고)
 */
export const STOCK_STATUS = {
  EXPIRED: { label: '폐기필요', tone: 'danger' },
  SOLD_OUT: { label: '품절', tone: 'danger' },
  LOW: { label: '부족예상', tone: 'caution' },
  NORMAL: { label: '정상', tone: 'good' },
  SURPLUS: { label: '충분', tone: 'good' },
};

export const ALERT_TYPES = {
  SOLD_OUT: { label: '품절', tone: 'danger' },
  EXPIRED: { label: '폐기필요', tone: 'danger' },
  ORDER_NEAR: { label: '발주 임박', tone: 'warn' },
  EXPIRY_NEAR: { label: '유통기한 임박', tone: 'warn' },
  SALES_ADJUST: { label: '판매 조정', tone: 'info' },
};

export const CTA_TYPES = {
  PURCHASE_ORDER: '발주 권장',
  MENU_SALES_INCREASE: '판매 촉진',
  MENU_SALES_DECREASE: '판매 억제',
  EXPIRY_PRIORITY_USE: '유통기한 임박분 우선 사용',
  RESOURCE_STOCK_INPUT: '실제 재고 입력',
  EXPIRY_CHECK: '유통기한 확인',
};

/** 알 수 없는 알림 코드는 영문 대신 회색 '확인 필요'로 표시 */
export const alertInfo = (type) => (type ? ALERT_TYPES[type] || { label: '확인 필요', tone: 'info' } : null);

/** API의 cta_label을 우선, 없으면 cta_type 기본 문구 */
export const ctaText = (rec) => rec?.cta_label || CTA_TYPES[rec?.cta_type] || '';

/**
 * 표 'AI 추천' 칸 문구 — 상태가 정상이어도 AI 응답에 추천이 있으면 표시
 * 우선순위: cta_label → title → action → cta_type 기본 문구 → reason (없으면 '')
 */
export const aiRecommendText = (rec) =>
  rec?.cta_label || rec?.title || rec?.action || CTA_TYPES[rec?.cta_type] || rec?.reason || '';

/**
 * 화면에 표시할 재고 상태 코드
 * API 상태가 EXPIRED이거나 유통기한이 이미 지났으면(EXPIRED 알림 포함) 'EXPIRED'(폐기필요)
 */
export function displayStockStatus(rec) {
  if (!rec) return '';
  const days = expiryInfo(rec.expiration_date, rec.days_to_expiry)?.days;
  if (rec.stock_status === 'EXPIRED' || rec.alert_type === 'EXPIRED' || (days != null && days < 0)) return 'EXPIRED';
  return rec.stock_status;
}

/** 유통기한 D-day 계산 (API의 days_to_expiry 우선) */
export function expiryInfo(expirationDate, daysToExpiry) {
  let days = Number.isFinite(daysToExpiry) ? daysToExpiry : null;
  if (days === null && /^\d{4}-\d{2}-\d{2}$/.test(expirationDate || '')) {
    const [y, m, d] = expirationDate.split('-').map(Number);
    const today = new Date();
    const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    days = Math.round((Date.UTC(y, m - 1, d) - t0) / 86400000);
  }
  if (days === null) return null;
  const label = days === 0 ? 'D-day' : days > 0 ? `D-${days}` : `D+${-days}`;
  const tone = days < 0 ? 'danger' : days <= 2 ? 'warn' : 'muted';
  return { days, label, tone };
}

/** 수량 표시 (소수점 1자리까지) */
export const formatQty = (n, unit = '') =>
  n === null || n === undefined ? '—' : `${Number.isInteger(n) ? n : Math.round(n * 10) / 10}${unit ? ` ${unit}` : ''}`;

/**
 * 예상 소진일 표시 (expected_depletion_days, 소수 가능 → 내림)
 * 0 → 당일 소진 예상 · 0~1 → 1일 이내 · 재고 부족 임박 · 1 이상 → N일 이내 · 음수/비정상 → 확인 필요
 * 반환: { text, urgent } | null(값 없음)
 */
export function formatDepletion(days) {
  if (days === null || days === undefined || days === '') return null;
  const d = Number(days);
  if (!Number.isFinite(d) || d < 0) return { text: '확인 필요', urgent: false };
  if (d === 0) return { text: '당일 소진 예상', urgent: true };
  if (d < 1) return { text: '1일 이내 · 재고 부족 임박', urgent: true };
  return { text: `${Math.floor(d)}일 이내`, urgent: false };
}
