/**
 * 판매 통계 Mock 데이터 — 그래프 확인용 테스트 값이며 실제 POS 데이터가 아닙니다.
 * forecast 값은 AI 예상 판매량(임시)입니다.
 */
export const SALES_STATS = {
  period_label: '최근 7일',
  daily: [
    { date: '2026-09-26', label: '9/26', actual: 47, forecast: null },
    { date: '2026-09-27', label: '9/27', actual: 43, forecast: null },
    { date: '2026-09-28', label: '9/28', actual: 50, forecast: null },
    { date: '2026-09-29', label: '9/29', actual: 57, forecast: null },
    { date: '2026-09-30', label: '9/30', actual: 68, forecast: null },
    { date: '2026-10-01', label: '10/1', actual: 77, forecast: null },
    { date: '2026-10-02', label: '10/2', actual: 63, forecast: null },
    { date: '2026-10-03', label: '10/3', actual: null, forecast: 70 },
    { date: '2026-10-04', label: '10/4', actual: null, forecast: 71 },
  ],
  menu_share: [
    { name: '양갈비', ratio: 34 },
    { name: '양꼬치', ratio: 24 },
    { name: '칭따오', ratio: 18 },
    { name: '가지튀김', ratio: 12 },
    { name: '기타', ratio: 12 },
  ],
};
