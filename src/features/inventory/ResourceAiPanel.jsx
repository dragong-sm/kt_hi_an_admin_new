import AiBadge from '../../components/AiBadge';
import Icon from '../../components/Icon';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { alertInfo, bySeverity, ctaText } from '../../config/inventoryLabels';

/** 7-2 사장님 재료관리 AI 결과 — 진입 시 자동 실행, 이후 "다시 분석하기" */
export default function ResourceAiPanel({ status, error, recs, onReanalyze, onSelect }) {
  const actionable = recs.filter((r) => r.alert_type || r.cta_type).sort(bySeverity);
  const urgent = actionable.filter((r) => alertInfo(r.alert_type)?.tone === 'danger').length;

  return (
    <section className="ai-panel" aria-labelledby="inventory-ai-title" aria-busy={status === 'loading'}>
      <div className="ai-panel-head">
        <AiBadge />
        <h2 id="inventory-ai-title">AI 재고 분석</h2>
      </div>

      {status === 'loading' && <LoadingState message="Hi-An이 목표 판매량과 현재 재고를 분석하고 있어요..." compact />}

      {status === 'error' && (
        <EmptyState variant="error" title="재고 분석을 완료하지 못했어요" description={error} onRetry={onReanalyze} retryLabel="다시 분석하기" />
      )}

      {status === 'success' && (
        <div className="ai-result">
          <p className="ai-summary">
            {recs.length === 0
              ? '분석할 재료 정보가 없어요.'
              : actionable.length
                ? `확인이 필요한 재료 ${actionable.length}건`
                : '모든 재료가 목표 판매량 기준으로 충분해요.'}
            {urgent > 0 && <span className="summary-urgent"> 긴급 {urgent}건</span>}
          </p>

          {actionable.length > 0 && (
            <ul className="rec-list">
              {actionable.map((r) => {
                const alert = alertInfo(r.alert_type);
                const cta = ctaText(r);
                return (
                  <li key={r.resource_id}>
                    <button type="button" className={`rec-card tone-${alert?.tone || 'info'}`} onClick={() => onSelect(r.resource_id)}>
                      <span className="rec-top">
                        {alert && <span className={`badge badge-${alert.tone === 'info' ? 'neutral' : alert.tone}`}>{alert.label}</span>}
                        <span className="rec-name">{r.name}</span>
                        <Icon name="chevron" size={16} />
                      </span>
                      {r.title && <strong className="rec-title">{r.title}</strong>}
                      {r.reason && <span className="rec-reason">{r.reason}</span>}
                      {r.action && <span className="rec-action">{r.action}</span>}
                      {cta && (
                        <span className="rec-cta">
                          <Icon name="sparkle" size={13} strokeWidth={2} />
                          {cta}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {actionable.length > 0 && recs.length > actionable.length && (
            <p className="muted ai-ok-note">나머지 {recs.length - actionable.length}개 재료는 이상 없어요.</p>
          )}

          <button type="button" className="btn btn-ghost btn-sm" onClick={onReanalyze}>
            <Icon name="refresh" size={15} />
            다시 분석하기
          </button>
        </div>
      )}
    </section>
  );
}
