/**
 * STOCK_ITEM(판매 메뉴) 목록 — 목표 판매량 입력 화면에 사용
 *
 * ⚠️ item_id는 n8n STOCK_ITEM 시트의 실제 ID와 같아야 합니다.
 *    현재 확인된 값은 ITEM_001(양갈비)뿐이며, 나머지는 시트를 보고 맞춰주세요.
 *    목표 판매량 입력에 보일 메뉴는 TARGET_SALES_ITEM_IDS 순서대로 표시됩니다.
 */
export const STOCK_ITEMS = [
  { item_id: 'ITEM_001', name: '양갈비' },
  { item_id: 'ITEM_002', name: '양꼬치' },
  { item_id: 'ITEM_003', name: '칭따오' },
  { item_id: 'ITEM_004', name: '가지튀김' },
  { item_id: 'ITEM_005', name: '계란볶음밥' },
  { item_id: 'ITEM_006', name: '꿔바로우' },
  { item_id: 'ITEM_007', name: '하얼빈 맥주' },
  { item_id: 'ITEM_008', name: '옥수수온면' },
  { item_id: 'ITEM_009', name: '토마토계란탕' },
  { item_id: 'ITEM_010', name: '콜라' },
];

export const TARGET_SALES_ITEM_IDS = ['ITEM_001', 'ITEM_002', 'ITEM_005', 'ITEM_008'];

export const TARGET_SALES_ITEMS = TARGET_SALES_ITEM_IDS.map((id) => STOCK_ITEMS.find((i) => i.item_id === id)).filter(Boolean);
