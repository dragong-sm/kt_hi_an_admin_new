import { useState } from 'react';
import Drawer from '../../components/Drawer';
import AiBadge from '../../components/AiBadge';
import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';
import { saveResourceStock } from '../../api/inventory';
import { useToast } from '../../components/Toast';
import { MARKETS, getMarketSearchLink } from '../../config/marketLinks';
import { alertInfo, ctaText, displayStockStatus, expiryInfo, formatDepletion, formatQty } from '../../config/inventoryLabels';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 재고 입력 — 7-1 resource-stock (action: "set") */
function StockForm({ resource, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(resource.stock ?? '');
  const [expiration, setExpiration] = useState(resource.expiration_date || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const valueStr = String(value).trim();
  const valueOk = valueStr !== '' && Number.isFinite(Number(valueStr)) && Number(valueStr) >= 0;
  const dateOk = expiration === '' || DATE_RE.test(expiration);

  const submit = async (e) => {
    e.preventDefault();
    if (!valueOk || !dateOk) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await saveResourceStock({
        action: 'set',
        resource_id: resource.resource_id,
        value: Number(valueStr),
        expiration_date: expiration || undefined,
      });
      const stock = data?.stock ?? Number(valueStr);
      const expiration_date = data?.expiration_date || expiration || resource.expiration_date;
      onSaved(resource.resource_id, { stock, expiration_date });
      setMessage({ ok: true, text: '저장되었어요. 다시 분석하면 AI 결과에 반영돼요.' });
      toast('재료 재고가 저장되었습니다.');
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="detail-form" onSubmit={submit} noValidate>
      <h3>재고 입력</h3>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="res-value">현재 수량</label>
          <div className={`input-suffix${valueStr !== '' && !valueOk ? ' is-invalid' : ''}`}>
            <input
              id="res-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {resource.unit && <span>{resource.unit}</span>}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="res-exp">유통기한</label>
          <input
            id="res-exp"
            className={`text-input${!dateOk ? ' is-invalid' : ''}`}
            type="date"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
          />
        </div>
      </div>
      {!valueOk && valueStr !== '' && <p className="field-msg is-error">수량은 0 이상의 숫자로 입력하세요.</p>}
      {!dateOk && <p className="field-msg is-error">유통기한은 YYYY-MM-DD 형식이어야 합니다.</p>}
      {message && <p className={`field-msg ${message.ok ? 'is-ok' : 'is-error'}`} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving || !valueOk || !dateOk}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}

/** 재료 상세 — 현재 정보 → Hi-An AI 분석 → 재고 입력 → 구매처 비교(보조) */
export default function ResourceDetailDrawer({ resource, aiStatus, onClose, onSaved }) {
  const exp = resource ? expiryInfo(resource.expiration_date, resource.days_to_expiry) : null;
  const depletion = resource && aiStatus === 'success' ? formatDepletion(resource.expected_depletion_days) : null;
  const alert = resource ? alertInfo(resource.alert_type) : null;
  const cta = resource ? ctaText(resource) : '';
  const hasAi = resource && (resource.title || resource.reason || resource.action || cta);

  return (
    <Drawer open={Boolean(resource)} onClose={onClose} title={resource?.name ?? ''} headerExtra={resource && aiStatus === 'success' && <StatusBadge status={displayStockStatus(resource)} />}>
      {resource && (
        <>
          <section aria-label="현재 정보">
            <dl className="detail-stats">
              <div>
                <dt>현재 수량</dt>
                <dd className={aiStatus === 'success' && displayStockStatus(resource) === 'SOLD_OUT' ? 'is-danger' : undefined}>{formatQty(resource.stock, resource.unit)}</dd>
              </div>
              <div>
                <dt>유통기한</dt>
                <dd className="dd-sm">
                  {resource.expiration_date || '—'}
                  {exp && <span className={`expiry-d tone-${exp.tone}`}>{exp.label}</span>}
                </dd>
              </div>
              <div>
                <dt>예상 소진일</dt>
                <dd className={`dd-sm${depletion?.urgent ? ' depletion-urgent' : ''}`}>
                  {aiStatus === 'loading' ? '분석중...' : (depletion?.text ?? '—')}
                </dd>
              </div>
              <div>
                <dt>일일 목표 소모량</dt>
                <dd className="dd-sm">{aiStatus === 'loading' ? '분석중...' : formatQty(resource.daily_target_usage, resource.unit)}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-ai" aria-labelledby="detail-ai-title">
            <div className="detail-ai-head">
              <AiBadge />
              <h3 id="detail-ai-title">분석 결과</h3>
              {aiStatus === 'success' && alert && <span className={`badge badge-${alert.tone === 'info' ? 'neutral' : alert.tone}`}>{alert.label}</span>}
            </div>
            {aiStatus === 'loading' ? (
              <p className="judgement-pending is-analyzing">분석중...</p>
            ) : aiStatus === 'error' ? (
              <p className="muted">AI 분석을 완료하지 못했어요. 재료 재고의 "AI 분석 다시하기"로 다시 시도하세요.</p>
            ) : hasAi ? (
              <>
                {resource.title && <p className="detail-ai-label">{resource.title}</p>}
                {resource.reason && <p className="detail-ai-message">{resource.reason}</p>}
                {cta && (
                  <p className="rec-cta">
                    <Icon name="sparkle" size={13} strokeWidth={2} />
                    {cta}
                  </p>
                )}
              </>
            ) : (
              <p className="muted">이 재료에 대한 AI 추천이 없어요.</p>
            )}
          </section>

          <StockForm key={resource.resource_id} resource={resource} onSaved={onSaved} />

          <section className="detail-market" aria-labelledby="detail-market-title">
            <h3 id="detail-market-title">구매처 비교</h3>
            <p className="muted">외부 쇼핑몰에서 직접 검색해 가격을 비교하세요.</p>
            <div className="market-links">
              {MARKETS.map((m) => {
                const href = getMarketSearchLink(m.key, resource.name);
                return href ? (
                  <a key={m.key} className="btn btn-secondary btn-sm" href={href} target="_blank" rel="noopener noreferrer">
                    {m.label}
                    <Icon name="external" size={14} />
                  </a>
                ) : (
                  <button key={m.key} type="button" className="btn btn-secondary btn-sm" disabled title="링크 준비 중">
                    {m.label}
                    <span className="soon-pill">링크 준비 중</span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </Drawer>
  );
}
