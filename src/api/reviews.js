import { ENDPOINTS, STORE_ID } from './config';
import { get, post, ApiError } from './n8n';
import { CACHE_KEYS, fetchFresh, invalidate, readCache } from './cache';

const str = (v) => (v == null ? '' : String(v).trim());
const has = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

/** recent_order_menu → 표시용 배열 (배열이 기본, 문자열로 와도 처리) */
function menuList(v) {
  if (Array.isArray(v)) return v.map((x) => str(x?.name ?? x)).filter(Boolean);
  return str(v)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * 사장님 답변 목록 — GET /webhook/review-response
 * 기본 응답: { success, responses: [{ review_id, owner_response, responded_at }] }
 * 필드명이 달라지면 이 함수에서만 맞춥니다. 반환: { [review_id]: { text, respondedAt } }
 */
export async function getReviewResponses() {
  const res = await get(ENDPOINTS.reviewResponse);
  const list = Array.isArray(res?.responses) ? res.responses : Array.isArray(res) ? res : null;
  if (!list) {
    console.warn('[review-response] 예상과 다른 응답:', res);
    throw new ApiError('사장님 답변 응답 형식을 확인할 수 없습니다.', 'INVALID_RESPONSE');
  }
  const map = {};
  for (const r of list) {
    const id = str(r?.review_id);
    const text = str(r?.owner_response ?? r?.response ?? r?.reply);
    if (id && text) map[id] = { text, respondedAt: str(r?.responded_at) };
  }
  return map;
}

/**
 * 고객 리뷰 목록 + 사장님 답변 (review_id 기준 매칭)
 * 리뷰 응답: { success, total, reviews: [{ review_id, nickname, recent_order_menu, review_question, review_answer, rating }] }
 * 답변 조회가 실패해도 리뷰 목록은 표시합니다. (responsesError로 알림)
 */
export async function getReviewList(storeId = STORE_ID) {
  const [res, responses] = await Promise.all([
    post(ENDPOINTS.reviewList, { store_id: storeId }),
    getReviewResponses().catch((e) => e),
  ]);
  if (!Array.isArray(res?.reviews)) {
    console.warn('[review-list] 예상과 다른 응답:', res);
    throw new ApiError('리뷰 목록 응답 형식을 확인할 수 없습니다.', 'INVALID_RESPONSE');
  }
  const answers = responses instanceof Error ? {} : responses;
  const reviews = res.reviews.map((r) => ({
    ...r,
    rating: Number(r.rating),
    menu_list: menuList(r.recent_order_menu),
    owner_response: answers[str(r.review_id)]?.text || '',
  }));
  const rated = reviews.filter((r) => Number.isFinite(r.rating));
  return {
    reviews,
    total: typeof res.total === 'number' ? res.total : reviews.length,
    // 응답에 average_rating이 있으면 그 값, 없으면 받은 리뷰들의 실제 평점 평균
    averageRating:
      typeof res.average_rating === 'number'
        ? res.average_rating
        : rated.length
          ? Math.round((rated.reduce((sum, r) => sum + r.rating, 0) / rated.length) * 10) / 10
          : null,
    responsesError: responses instanceof Error ? responses.message : null,
  };
}

/* ---------- review-generate 응답 → { greetings, bodies, closings } ---------- */
const KEYS = {
  greetings: ['greetings', 'greeting', 'openings', 'opening', 'intros', 'intro'],
  bodies: ['bodies', 'body', 'middles', 'middle', 'mains', 'main'],
  closings: ['closings', 'closing', 'endings', 'ending', 'outros', 'outro'],
};
const text = (x) => str(typeof x === 'string' ? x : (x?.text ?? x?.content));
const part = (src, keys) => {
  const v = keys.map((k) => src?.[k]).find((x) => x != null);
  return (Array.isArray(v) ? v : v ? [v] : []).map(text).filter(Boolean);
};

function toCandidates(data) {
  for (const src of [data, data?.recommendations, data?.candidates, data?.answer]) {
    const c = { greetings: part(src, KEYS.greetings), bodies: part(src, KEYS.bodies), closings: part(src, KEYS.closings) };
    if (c.greetings.length || c.bodies.length || c.closings.length) return c;
  }
  console.warn('[review-generate] 예상과 다른 응답:', data);
  throw new ApiError('AI 답변 응답에서 인삿말·본문·마무리 후보를 찾지 못했습니다.', 'INVALID_RESPONSE');
}

/** AI 리뷰 답변 생성 — POST /webhook/review-generate (review-list에서 받은 실제 값을 그대로 전달) */
export async function generateReview(review) {
  const body = {
    review_id: review.review_id,
    nickname: review.nickname,
    recent_order_menu: review.recent_order_menu,
    review_question: review.review_question,
    review_answer: review.review_answer,
    rating: review.rating,
  };
  return toCandidates(await post(ENDPOINTS.reviewGenerate, body));
}

/**
 * 사장님 답변 저장 — POST /webhook/owner-review-response
 * body: { review_id, member_id, response }
 * - review_id·member_id는 review-list에서 받은 실제 값 (비회원은 member_id = null)
 * - response는 사장님이 최종 수정한 답변
 */
export function saveOwnerReviewResponse(review, finalResponse) {
  if (!has(review?.review_id)) {
    return Promise.reject(new ApiError('리뷰 ID가 없어 답변을 저장할 수 없습니다.', 'MISSING_REVIEW_ID'));
  }
  return post(ENDPOINTS.ownerReviewResponse, {
    review_id: review.review_id,
    member_id: has(review.member_id) ? review.member_id : null,
    response: finalResponse,
  });
}

/** 리뷰 목록 최신 값 (localStorage 캐시 갱신 포함) */
export const fetchReviews = ({ force = false } = {}) => fetchFresh(CACHE_KEYS.reviews, getReviewList, { force });
export const cachedReviews = () => readCache(CACHE_KEYS.reviews);
export const invalidateReviews = () => invalidate(CACHE_KEYS.reviews);
