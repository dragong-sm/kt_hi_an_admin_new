import { ENDPOINTS, STORE_ID } from './config';
import { get, post, put, ApiError } from './n8n';
import { CACHE_KEYS, fetchFresh, invalidate, readCache } from './cache';

const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const str = (v) => (v == null ? '' : String(v));

/*
 * 재료 목록과 AI 분석은 같은 주소(/webhook/owner-resource-management)를 method로 구분합니다.
 *   GET  → 재료 목록 (화면에 바로 표시)
 *   POST → AI 재료 분석 (재고 상태·AI 추천 등)
 */

/** 재료 기본 정보 (GET 재료 목록) */
const normalizeResource = (r) => ({
  resource_id: str(r.resource_id),
  name: str(r.name || r.resource_name || r.resource_id),
  stock: num(r.stock),
  unit: str(r.unit),
  expiration_date: str(r.expiration_date),
  // GET 응답에 분석/상태 값이 함께 오면 보존한다.
  daily_target_usage: num(r.daily_target_usage ?? r.daily_target_consumption ?? r.daily_target_use ?? r.target_daily_usage ?? r.target_usage ?? r.daily_usage),
  expected_depletion_days: num(r.expected_depletion_days ?? r.depletion_days ?? r.expected_depletion ?? r.days_to_depletion),
  days_to_expiry: num(r.days_to_expiry),
  stock_status: str(r.stock_status).toUpperCase(),
  alert_type: str(r.alert_type).toUpperCase(),
  title: str(r.title),
  reason: str(r.reason),
  action: str(r.action),
  cta_type: str(r.cta_type).toUpperCase(),
  cta_label: str(r.cta_label),
});

/** AI 분석 결과 (POST AI 재료 분석) — 재료 목록 위에 resource_id 기준으로 덮어씀 */
const normalizeAnalysis = (r) => ({
  resource_id: str(r.resource_id),
  daily_target_usage: num(r.daily_target_usage ?? r.daily_target_consumption ?? r.daily_target_use ?? r.target_daily_usage ?? r.target_usage ?? r.daily_usage),
  expected_depletion_days: num(r.expected_depletion_days ?? r.depletion_days ?? r.expected_depletion ?? r.days_to_depletion),
  days_to_expiry: num(r.days_to_expiry),
  stock_status: str(r.stock_status).toUpperCase(),
  alert_type: str(r.alert_type).toUpperCase(),
  title: str(r.title),
  reason: str(r.reason),
  action: str(r.action),
  cta_type: str(r.cta_type).toUpperCase(),
  cta_label: str(r.cta_label),
});

/** 응답에서 재료 배열 찾기: data.resources · data.recommendations · data.items · 배열 */
function pickList(data, keys) {
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  for (const k of keys) if (Array.isArray(data?.data?.[k])) return data.data[k];
  if (Array.isArray(data)) {
    for (const row of data) {
      for (const k of keys) if (Array.isArray(row?.[k])) return row[k];
      for (const k of keys) if (Array.isArray(row?.data?.[k])) return row.data[k];
    }
    return data;
  }
  return null;
}

/** 재료 목록 조회 — GET /webhook/owner-resource-management */
export async function getResources() {
  const list = pickList(await get(ENDPOINTS.ownerResourceManagement), ['resources', 'items', 'recommendations']);
  if (!list) throw new ApiError('재료 목록 응답 형식을 확인할 수 없습니다.', 'INVALID_RESPONSE');
  return list.filter((r) => r?.resource_id).map(normalizeResource);
}

/** AI 재료 분석 — POST /webhook/owner-resource-management */
export async function analyzeResources() {
  const data = await post(ENDPOINTS.ownerResourceManagement, { store_id: STORE_ID });
  const list = pickList(data, ['recommendations', 'resources', 'items']);
  if (!list) throw new ApiError('AI 분석 응답 형식을 확인할 수 없습니다.', 'INVALID_RESPONSE');
  const valid = list.filter((r) => r?.resource_id);
  return { analysis: valid.map(normalizeAnalysis), resources: valid.map(normalizeResource) };
}

/** 7-1 재료 입력 (PUT) — expiration_date를 생략하면 기존 유통기한 유지 */
export function saveResourceStock({ resource_id, value, expiration_date, action = 'set', name, unit }) {
  return put(ENDPOINTS.resourceStock, {
    action,
    resource_id,
    value,
    ...(expiration_date && { expiration_date }),
    ...(name && { name }),
    ...(unit && { unit }),
  });
}

/** 7-3 목표 판매량 저장 */
export function saveTargetSales(item_id, value, action = 'set') {
  return post(ENDPOINTS.stockItemStock, { action, item_id, value });
}

/**
 * 오늘 목표 판매량 목록 — GET /webhook/stock-item-stock
 * 실제 응답이 menus/items/stock_items/data 아래 어느 형태로 와도 정규화한다.
 */
export async function getTargetSalesItems() {
  const data = await get(ENDPOINTS.stockItemStock);
  const list = pickList(data, ['menus', 'items', 'stock_items', 'stocks']);
  if (!list) throw new ApiError('목표 판매량 응답 형식을 확인할 수 없습니다.', 'INVALID_RESPONSE');

  return list
    .filter((r) => r?.item_id)
    .map((r) => ({
      item_id: str(r.item_id),
      name: str(r.name || r.item_name || r.menu_name || r.item_id),
      stock: num(r.stock ?? r.target_stock ?? r.target_sales ?? r.value),
      is_sold_out: Boolean(r.is_sold_out),
    }));
}


/** 재료 재고 기반 오늘 목표 판매량 AI 추천 — POST /webhook/recommand-stock */
export async function getTargetSalesRecommendation() {
  const data = await post(ENDPOINTS.recommendStock, { store_id: STORE_ID });
  const list = pickList(data, ['recommendations', 'menus', 'items', 'stock_items', 'stocks']);
  if (!list) throw new ApiError('목표 판매량 추천 응답 형식을 확인할 수 없습니다.', 'INVALID_RESPONSE');

  return list
    .filter((r) => r?.item_id || r?.name || r?.item_name || r?.menu_name)
    .map((r) => ({
      item_id: str(r.item_id),
      name: str(r.name || r.item_name || r.menu_name || r.item_id),
      recommended: num(
        r.recommended_stock ??
        r.recommended_target_sales ??
        r.recommended_target ??
        r.recommended_quantity ??
        r.recommend_stock ??
        r.target_stock ??
        r.target_sales ??
        r.value ??
        r.stock
      ),
      reason: str(r.reason || r.message || r.description),
    }));
}

/** 재료 목록 최신 값 (localStorage 캐시 갱신 포함) */
export const fetchResources = ({ force = false } = {}) => fetchFresh(CACHE_KEYS.resources, getResources, { force });
export const cachedResources = () => readCache(CACHE_KEYS.resources);
export const invalidateResources = () => invalidate(CACHE_KEYS.resources);
