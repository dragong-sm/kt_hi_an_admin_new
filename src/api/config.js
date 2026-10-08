/**
 * n8n API 설정 — 주소는 이 파일에서만 관리합니다. (브라우저 → n8n 직접 호출)
 * VITE_N8N_BASE_URL 환경변수로 호스트를 바꿀 수 있습니다.
 */
export const N8N_BASE_URL = (import.meta.env.VITE_N8N_BASE_URL || 'https://gogogogommmm.app.n8n.cloud').replace(/\/+$/, '');

export const ENDPOINTS = {
  resourceStock: '/webhook/resource-stock', //                     7-1 재료 수량·유통기한 입력 (PUT)
  ownerResourceManagement: '/webhook/owner-resource-management', // 재료 목록 (GET) · AI 재료 분석 (POST)
  stockItemStock: '/webhook/stock-item-stock', //                  7-3 목표 판매량 저장 (POST)
  recommendStock: '/webhook/recommand-stock', //                   오늘 목표 판매량 AI 추천 (GET/POST)
  menu: '/webhook/menu', //                                        메뉴 목록·현재 목표량 menus[].stock (GET)
  reviewList: '/webhook/review-list', //                           고객 리뷰 목록 (POST)
  reviewGenerate: '/webhook/review-generate', //                   AI 리뷰 답변 생성 (POST)
  ownerReviewResponse: '/webhook/owner-review-response', //        사장님 답변 저장 (POST)
  reviewResponse: '/webhook/review-response', //                   사장님 답변 목록 조회 (GET)
};

export const STORE_ID = 'STORE_001';
export const STORE_NAME = '또치네 양갈비';
