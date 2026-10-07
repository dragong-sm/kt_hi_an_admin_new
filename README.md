# Hi-An Admin

식당 사장님용 **Hi-An AI Agent** 관리자 페이지입니다. 고객용 Hi-An 주문 페이지와는 별개의 프로젝트입니다.

| 항목 | 값 |
| --- | --- |
| 버전 | v2.0 |
| GitHub Repository | `Hi-an-admin` |
| 배포 | Vercel (Framework: Vite · Build: `npm run build` · Output: `dist`) |
| 스택 | React 19 + Vite 7 (JavaScript), 외부 UI·차트 라이브러리 없음 |

## 기능

**재고 관리** (`/`, `/inventory`)

- 오늘 목표 판매량은 모달로 입력합니다. 하루에 한 번(기기 날짜 기준, localStorage) 접속 시 자동으로 열리고, 이후에는 상단 "오늘 목표 판매량" 버튼으로 다시 열 수 있습니다.
- 모달에서는 메뉴별 현재값과 변경할 값을 나란히 보여줍니다. 현재값은 `GET /webhook/menu` 응답의 `menus[].stock`이며 `item_id`로 매칭하고, 없으면 메뉴 이름으로 매칭합니다. 입력값의 앞자리 0은 자동으로 지워집니다(015 → 15). 저장은 7-3 `action: "set"`이며, 끝나면 "저장되었어요" 알림이 한 번 뜹니다.
- 페이지에 들어오면 같은 주소(`/webhook/owner-resource-management`)를 두 번 호출합니다. GET으로 재료 목록을 받아 바로 표시하고, 동시에 POST로 AI 분석을 실행합니다. 분석이 끝날 때까지 재고 상태·AI 추천·요약 카드는 `분석중...`으로 표시됩니다.
- "AI 분석 다시하기"는 재료 목록은 그대로 두고 AI 결과만 지운 뒤 다시 분석합니다.
- 재료 목록의 행을 누르면 상세 Drawer가 열리고, 그 안에서 수량과 유통기한을 수정합니다. (7-1)
- 요약 카드(전체 재료, 부족·품절, 유통기한 임박, 발주 권장)는 `owner-resource-management` 응답으로 계산합니다.

**리뷰 관리** (`/reviews`)

- 페이지에 들어오면 `review-list`로 고객 리뷰 목록을 불러옵니다. 전체 리뷰는 응답의 `total`을 쓰고, 평균 평점은 `average_rating`이 있으면 그 값을, 없으면 받은 리뷰의 실제 평점 평균을 씁니다.
- 리뷰 목록과 함께 `GET /webhook/review-response`로 사장님 답변을 불러와 `review_id`로 매칭해 한 카드에 표시합니다. 리뷰 ID는 화면에 표시하지 않습니다.
- 카드 첫 줄은 `닉네임 | 평점 | 최근 주문내역`(닉네임이 없으면 `비회원`, 주문 메뉴는 `A · B`, 없으면 `최근 주문 없음`)이고, 그 아래에 리뷰 질문·리뷰 응답, "사장님의 리뷰답변"을 표시합니다.
- 답변이 없으면 "아직 등록된 답변이 없습니다."와 "AI 답변 작성" 버튼을 표시합니다.
- 응답에 없는 값은 만들지 않습니다.
- "AI 답변 작성"을 누르면 `review-generate`가 인삿말·본문·마무리 후보를 3개씩 만듭니다. 하나씩 고르면 답변 초안이 줄바꿈으로 합쳐지고, 직접 수정할 수 있습니다.
- "답변 등록"을 누르면 `owner-review-response`로 최종 답변을 저장합니다. 성공하면 "답변이 등록되었습니다."가 표시되고, 카드에 바로 반영한 뒤 리뷰 목록과 답변을 다시 불러옵니다.

## n8n API (브라우저에서 직접 호출)

주소와 경로는 `src/api/config.js` 한 곳에서 관리합니다. 공통 호출 함수는 `src/api/n8n.js`의 `request()`(GET·POST·PUT 지원)입니다.

| 기능 | Method | Endpoint | Body |
| --- | --- | --- | --- |
| 7-1 재료 입력 | **PUT** | `/webhook/resource-stock` | `{ action: "set" \| "update", resource_id, value, expiration_date? }` |
| 재료 목록 | GET | `/webhook/owner-resource-management` | – |
| 7-2 AI 재료 분석 | POST | `/webhook/owner-resource-management` | `{ store_id }` |
| 7-3 목표 판매량 저장 | POST | `/webhook/stock-item-stock` | `{ action: "set", item_id, value }` |
| 메뉴 목록·현재 목표량 | GET | `/webhook/menu` | – (응답 `menus[].stock`) |
| 리뷰 목록 | POST | `/webhook/review-list` | `{ store_id }` → 응답 `{ success, total, reviews[] }` (최상위) |
| AI 리뷰 답변 생성 | POST | `/webhook/review-generate` | `{ review_id, nickname, recent_order_menu, review_question, review_answer, rating }` (review-list 값 그대로) |
| 사장님 답변 조회 | GET | `/webhook/review-response` | – → 응답 `{ success, responses: [{ review_id, owner_response, responded_at }] }` |
| 사장님 답변 저장 | POST | `/webhook/owner-review-response` | `{ review_id, member_id, response }` (review_id·member_id는 review-list 실제 값, 비회원 member_id는 null) |

- 응답이 `{ success, data }`면 `data`를, `data`가 없는 `{ success, ... }`면 응답 전체를 사용합니다. 실패하면 `error.message`를 화면에 표시합니다.
- n8n 각 Webhook의 Allowed Origins (CORS) 설정이 배포 주소를 허용해야 합니다.
- 호스트 변경(선택): `VITE_N8N_BASE_URL`로 바꿀 수 있습니다.
- **코드 위치**
  - 목표 판매량 메뉴와 `item_id`: `src/config/stockItems.js`
  - 재고 코드의 한글 표시: `src/config/inventoryLabels.js`
  - 구매처 링크: `src/config/marketLinks.js`
  - 리뷰 응답 해석: `src/api/reviews.js`

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
npm run lint
npm run build
```

## 폴더 구조

```
public/assets/        hi-an-logo.png · hi-an-icon.png
src/
  api/                config.js(n8n 주소·경로) · n8n.js(GET·POST·PUT 공통 호출) · cache.js(localStorage 캐시) · inventory.js(7-1·7-2·7-3) · reviews.js(리뷰 목록·답변)
  config/             stockItems.js · inventoryLabels.js · marketLinks.js
  components/         Sidebar · Drawer · Modal · StatCard · StatusBadge · Toast …
  features/
    inventory/        TargetSalesModal · ResourceTable · ResourceDetailDrawer
    reviews/          ReviewCard · AiReplyPanel · Stars
  pages/              InventoryPage · ReviewPage(지연 로딩)
```

## 캐시 (stale-while-revalidate)

- 첫 접속 시 재료 목록과 리뷰 목록을 동시에 미리 불러와 localStorage에 저장합니다(`hian-admin:cache:v1:*`).
- 다음 접속에서는 캐시를 먼저 보여주고, 실제 API를 다시 호출해 최신 값으로 교체합니다. 최신 값을 못 받으면 "마지막으로 저장된 정보" 안내를 표시합니다.
- 재료 수량·유통기한 저장이나 리뷰 답변 저장 후에는 해당 캐시를 지우고 다시 불러옵니다. AI 분석 결과와 메뉴 목록은 캐시하지 않습니다.

## 변경 이력

- **v2.0**: feat: 리뷰 카드에 사장님 답변 조회 및 UI 재구성
  - `review-response`를 GET(파라미터 없음)으로 호출해 `review_id` 기준으로 사장님 답변을 카드에 표시합니다.
  - 카드를 `닉네임 | 평점 | 최근 주문내역` 한 줄, 질문·응답 한 블록, 사장님 답변 강조 블록으로 재구성했습니다.
  - 답변 저장 후 즉시 반영하고 다시 조회합니다. 미리 불러온 결과는 5초 동안 재사용해 중복 호출을 줄였습니다.

- **v1.9**: fix: 재고 상태/AI 추천 표시 개선 및 리뷰 답변 조회 연동
  - 재고 상태를 폐기필요(EXPIRED·유통기한 경과)·품절·부족예상·정상·충분 한글로 통일했습니다. 영문 코드는 표시하지 않습니다.
  - AI 추천은 상태와 관계없이 응답에 추천(cta_label·title·action·reason)이 있으면 표시하고, 없을 때만 "추천 없음"으로 표시합니다.
  - 리뷰 카드를 compact하게 정리하고 리뷰 ID를 숨겼습니다. `review-response`로 사장님 답변을 조회해 `review_id` 기준으로 표시합니다.

- **v1.8**: feat: 목표판매량 재고조회 개선 및 재료상태/소진일 UI 정리
  - 목표 판매량 현재값을 `/webhook/menu`에서 읽고, 입력 앞자리 0을 없앴습니다. 저장 완료 알림은 한 번만 표시합니다.
  - 재고 상태를 품절(빨강)·부족예상(주황)·충분(초록) 3단계로 정리했습니다.
  - 재료 표를 고정 너비로 바꾸고 긴 텍스트는 말줄임 처리했습니다. 예상 소진일은 내림해 "N일 이내"로 표시하고, 1일 미만은 임박으로 강조합니다.
  - 재료·리뷰 목록에 localStorage 캐시(stale-while-revalidate)를 적용했습니다.

- **v1.6**: fix: 재료 목록/AI 분석 호출 분리 및 리뷰 목록 응답 구조 반영
  - 재료 목록(GET)은 바로 표시하고, AI 분석(POST)은 따로 실행해 결과가 올 때까지 `분석중...`으로 표시합니다.
  - 리뷰는 실제 필드(`review_id, nickname, recent_order_menu, review_question, review_answer, rating`)를 그대로 표시하고 review-generate에도 전달합니다. 응답에 날짜가 없어 날짜는 표시하지 않습니다.

- **v1.5**: feat: 목표 판매량 모달화 및 재고관리 화면 단순화
  - n8n 기본 도메인을 `gogommmmmmm.app.n8n.cloud`로 바꿨습니다. path와 method는 그대로입니다.
  - 목표 판매량을 하루 1회 자동으로 뜨는 모달로 옮기고, 현재값과 변경값을 비교할 수 있게 했습니다.
  - 판매 그래프 2개와 우측 AI 재고 분석 패널을 삭제하고, 재료 재고를 전체 폭으로 넓혔습니다.

- **v1.4**: fix: 사장님 리뷰 답변 저장 시 review_id 포함. body를 `{ review_id, member_id, response }` 형식으로 맞췄고, review_id가 없으면 저장하지 않습니다.

- **v1.3**: fix: 리뷰 회원정보 표시 및 재고관리 Mock 데이터 제거
  - 리뷰 카드 상단을 `닉네임(또는 비회원) · 별점`으로 바꿨습니다.
  - 판매 그래프 Mock을 제거하고 "데이터 없음"으로 표시합니다.
- **v1.2**: fix: Admin 전체 n8n API 연결 일괄 점검 및 잘못된 호출 제거
  - 목표 판매량을 `/webhook-test/`에서 `/webhook/stock-item-stock`으로 바꿨습니다.
  - API 주소는 `src/api/config.js` 한 곳에서만 관리합니다.
- **v1.1**: fix: 최신 리뷰 API 반영 및 이전 API 호출 제거 (새 저장소 기준으로 버전 재시작)
