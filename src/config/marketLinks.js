/**
 * 구매처 비교 링크 설정
 *
 * 실제 가격 조회나 상품 추천은 하지 않습니다. 외부 쇼핑몰 '검색 결과 페이지'로 이동하는 링크만 제공합니다.
 * 링크가 확정되면 아래 템플릿에 검색 URL을 넣으세요. {query} 자리에 품목명이 들어갑니다.
 *   예) NAVER:   'https://search.shopping.naver.com/search/all?query={query}'
 *       COUPANG: 'https://www.coupang.com/np/search?q={query}'
 * 값이 비어 있으면 버튼이 비활성화되고 "링크 준비 중"으로 표시됩니다.
 */
export const MARKET_LINKS = {
  NAVER: '',
  COUPANG: '',
};

export const MARKETS = [
  { key: 'NAVER', label: '네이버 쇼핑' },
  { key: 'COUPANG', label: '쿠팡' },
];

/** 템플릿이 없으면 null */
export function getMarketSearchLink(marketKey, itemName) {
  const template = MARKET_LINKS[marketKey];
  if (!template || !itemName) return null;
  return template.replace('{query}', encodeURIComponent(itemName));
}

export const getNaverSearchLink = (itemName) => getMarketSearchLink('NAVER', itemName);
export const getCoupangSearchLink = (itemName) => getMarketSearchLink('COUPANG', itemName);
