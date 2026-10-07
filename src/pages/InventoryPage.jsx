import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeResources, cachedResources, fetchResources, invalidateResources } from '../api/inventory';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import TargetSalesModal from '../features/inventory/TargetSalesModal';
import ResourceTable from '../features/inventory/ResourceTable';
import ResourceDetailDrawer from '../features/inventory/ResourceDetailDrawer';
import ResourceInputModal from '../features/inventory/ResourceInputModal';
import { useRouter } from '../router';
import { expiryInfo } from '../config/inventoryLabels';

/** 목표 판매량 모달 하루 1회 자동 노출 (기기 날짜 기준, localStorage) */
const TARGET_MODAL_KEY = 'hian-admin:target-modal-shown';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function shouldAutoOpen() {
  try {
    if (localStorage.getItem(TARGET_MODAL_KEY) === today()) return false;
    localStorage.setItem(TARGET_MODAL_KEY, today());
  } catch {
    /* 저장소를 쓸 수 없으면 매번 자동으로 띄우지 않음 */
    return false;
  }
  return true;
}

/**
 * 재고 관리
 * 1) GET 재료 목록 → 바로 표시
 * 2) 동시에 POST AI 분석 → 끝날 때까지 AI 관련 칸은 "분석중..."
 * "AI 분석 다시하기"는 목록은 그대로 두고 AI 결과만 비운 뒤 다시 분석합니다.
 * 재료 목록은 localStorage 캐시가 있으면 먼저 보여주고, 실제 API로 다시 불러와 교체합니다. (stale-while-revalidate)
 */
export default function InventoryPage() {
  const [list, setList] = useState(() => {
    const cached = cachedResources();
    return cached ? { status: 'success', items: cached, error: null, stale: true } : { status: 'loading', items: [], error: null };
  });
  const [ai, setAi] = useState({ status: 'loading', byId: {}, error: null });
  const [edits, setEdits] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [targetOpen, setTargetOpen] = useState(shouldAutoOpen);
  const [resourceInputOpen, setResourceInputOpen] = useState(false);
  const { refreshKey } = useRouter();
  const aiSeq = useRef(0);
  const listSeq = useRef(0);

  /** 재료 목록 최신화 — 이미 보여주는 목록(캐시 포함)은 유지한 채 백그라운드로 교체 */
  const loadList = useCallback(async () => {
    const seq = ++listSeq.current;
    setList((s) => (s.items.length ? s : { ...s, status: 'loading', error: null }));
    try {
      const items = await fetchResources({ force: true });
      if (seq !== listSeq.current) return;
      setList({ status: 'success', items, error: null, stale: false });
      setEdits({});
    } catch (e) {
      if (seq !== listSeq.current) return;
      setList((s) => (s.items.length ? { ...s, staleError: e.message } : { ...s, status: 'error', error: e.message }));
    }
  }, []);

  /** 재료 수량·유통기한 저장 후: 캐시 무효화 → 다시 불러오기 */
  const handleResourceSaved = useCallback(
    (id, patch) => {
      setEdits((s) => ({ ...s, [id]: { ...s[id], ...patch, days_to_expiry: null } }));
      invalidateResources();
      loadList();
    },
    [loadList],
  );

  const analyze = useCallback(async () => {
    const seq = ++aiSeq.current;
    setAi({ status: 'loading', byId: {}, error: null }); // 이전 결과를 지우고 분석중 표시
    try {
      const { analysis, resources } = await analyzeResources();
      if (seq !== aiSeq.current) return;
      setAi({ status: 'success', byId: Object.fromEntries(analysis.map((r) => [r.resource_id, r])), error: null });
      // 재료 목록 조회가 실패했다면 분석 응답의 재료 정보로 목록을 채움
      setList((s) => (s.status === 'error' && resources.length ? { status: 'success', items: resources, error: null } : s));
    } catch (e) {
      if (seq !== aiSeq.current) return;
      setAi({ status: 'error', byId: {}, error: e.message });
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList, refreshKey]);

  useEffect(() => {
    analyze();
  }, [analyze]);

  const aiReady = ai.status === 'success';

  /**
   * 재료 기본 정보 + AI 분석 결과 + 저장한 수정값
   * AI 응답이 특정 재료를 생략하더라도 표가 빈칸이 되지 않도록 기본 상태를 보완합니다.
   * GET 응답에 상태/추천 값이 있으면 그것을 우선하고, 정말 아무 분석값도 없을 때만 정상 상태 안내를 사용합니다.
   */
  const resources = useMemo(
    () =>
      list.items.map((r) => {
        const analyzed = aiReady ? ai.byId[r.resource_id] : null;
        if (!aiReady) return { ...r, ...edits[r.resource_id] };

        let merged = { ...r, ...(analyzed || {}), ...edits[r.resource_id] };

        // AI가 일일 목표 소모량/예상 소진일 중 하나만 주는 경우 현재 재고로 나머지 값을 계산해 보완합니다.
        // 둘 다 없는 경우에는 임의 값을 만들지 않습니다.
        const stock = Number(merged.stock);
        const daily = Number(merged.daily_target_usage);
        const depletion = Number(merged.expected_depletion_days);
        if (Number.isFinite(stock) && Number.isFinite(daily) && daily > 0 && !Number.isFinite(depletion)) {
          merged = { ...merged, expected_depletion_days: stock / daily };
        } else if (Number.isFinite(stock) && Number.isFinite(depletion) && depletion > 0 && !Number.isFinite(daily)) {
          merged = { ...merged, daily_target_usage: stock / depletion };
        }

        if (analyzed || merged.stock_status || merged.title || merged.action || merged.cta_label) return merged;

        const days = expiryInfo(merged.expiration_date, merged.days_to_expiry)?.days;
        if (days != null && days < 0) {
          return {
            ...merged,
            stock_status: 'EXPIRED',
            alert_type: 'EXPIRED',
            title: '폐기 필요',
            reason: '유통기한이 지난 재료예요.',
            action: '사용하지 말고 폐기 여부를 확인해 주세요.',
            cta_type: 'EXPIRY_CHECK',
            cta_label: '유통기한 확인',
          };
        }
        if (Number(merged.stock) === 0) {
          return {
            ...merged,
            stock_status: 'SOLD_OUT',
            alert_type: 'SOLD_OUT',
            title: '재고 보충 필요',
            reason: '현재 재고가 0이에요.',
            action: '재고 보충 여부를 확인해 주세요.',
            cta_type: 'PURCHASE_ORDER',
            cta_label: '발주 검토',
          };
        }
        return {
          ...merged,
          stock_status: 'NORMAL',
          title: '현재 상태 유지',
          reason: '현재 재고와 유통기한에 특이사항이 없어요.',
          action: '현재 상태를 유지해 주세요.',
          cta_label: '현재 상태 유지',
        };
      }),
    [list.items, edits, ai, aiReady],
  );

  const stats = useMemo(() => {
    if (!aiReady) return null;
    const count = (fn) => resources.filter(fn).length;
    const soldOut = count((r) => r.stock_status === 'SOLD_OUT');
    const expired = count((r) => r.alert_type === 'EXPIRED');
    return {
      soldOut,
      short: soldOut + count((r) => r.stock_status === 'LOW'),
      expired,
      expiring: expired + count((r) => r.alert_type === 'EXPIRY_NEAR'),
      order: count((r) => r.cta_type === 'PURCHASE_ORDER'),
    };
  }, [resources, aiReady]);

  const hint = ai.status === 'loading' ? '분석중...' : ai.status === 'error' ? 'AI 분석 실패' : undefined;
  const status = list.status;
  const error = list.error;

  return (
    <div className="page">
      <PageHeader
        title="재고 관리"
        description="목표 판매량과 현재 재료 재고를 기준으로 Hi-An이 부족·유통기한·발주를 분석합니다."
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => setTargetOpen(true)}>
            오늘 목표 판매량
          </button>
        }
      />

      <div className="stat-grid">
        <StatCard label="전체 재료" value={list.status === 'success' ? list.items.length : null} unit="개" />
        <StatCard label="품절·부족예상" value={stats?.short} unit="개" tone="danger" hint={stats ? `품절 ${stats.soldOut}개` : hint} />
        <StatCard label="유통기한 임박" value={stats?.expiring} unit="개" tone="warn" hint={stats ? `지남 ${stats.expired}개` : hint} />
        <StatCard label="발주 권장" value={stats?.order} unit="개" tone="ai" hint={stats ? 'Hi-An AI 판단' : hint} />
      </div>

      <section className="card" aria-labelledby="resource-list-title">
        <div className="card-head">
          <div>
            <h2 id="resource-list-title">재료 재고</h2>
            <span className="card-note">행을 누르면 AI 분석 결과와 수량·유통기한을 확인·수정할 수 있어요</span>
          </div>
          <div className="resource-head-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResourceInputOpen(true)} disabled={!resources.length}>
              재료 입력
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={analyze} disabled={ai.status === 'loading'}>
              <Icon name="refresh" size={15} />
              {ai.status === 'loading' ? '분석중...' : 'AI 분석 다시하기'}
            </button>
          </div>
        </div>
        {list.staleError && (
          <p className="field-msg card-alert muted-note">최신 재료 목록을 불러오지 못해 마지막으로 저장된 정보를 보여주고 있어요. ({list.staleError})</p>
        )}
        {ai.status === 'error' && <p className="field-msg is-error card-alert">AI 재고 분석을 완료하지 못했어요: {ai.error}</p>}
        {resources.length > 0 ? (
          <ResourceTable resources={resources} aiStatus={ai.status} editedIds={new Set(Object.keys(edits))} onSelect={setSelectedId} />
        ) : status === 'loading' ? (
          <LoadingState message="재료 목록을 불러오고 있어요..." />
        ) : status === 'error' ? (
          <EmptyState variant="error" title="재료 정보를 불러오지 못했어요" description={error} onRetry={loadList} />
        ) : (
          <EmptyState title="등록된 재료가 없어요" description="n8n RESOURCE 시트에 재료가 등록되면 이곳에 표시됩니다." />
        )}
      </section>

      <TargetSalesModal open={targetOpen} onClose={() => setTargetOpen(false)} onSaved={analyze} />

      <ResourceInputModal
        open={resourceInputOpen}
        resources={resources}
        onClose={() => setResourceInputOpen(false)}
        onSaved={async () => {
          invalidateResources();
          await loadList();
          await analyze();
        }}
      />

      <ResourceDetailDrawer
        resource={resources.find((r) => r.resource_id === selectedId)}
        aiStatus={ai.status}
        onClose={() => setSelectedId(null)}
        onSaved={handleResourceSaved}
      />
    </div>
  );
}
