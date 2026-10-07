import { useState } from 'react';
import { saveTargetSales } from '../../api/inventory';
import { TARGET_SALES_ITEMS } from '../../config/stockItems';
import { useToast } from '../../components/Toast';

const isValid = (v) => /^\d+$/.test(v);

/**
 * 오늘 목표 판매량 입력 — 7-3 stock-item-stock (action: "set")
 * 저장에 성공한 메뉴가 있으면 onSaved()로 AI 재고 분석을 다시 실행합니다.
 */
export default function TargetSalesCard({ onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState({});
  const [results, setResults] = useState({});
  const [saving, setSaving] = useState(false);

  const entries = TARGET_SALES_ITEMS.filter((i) => (values[i.item_id] ?? '') !== '');
  const invalid = entries.some((i) => !isValid(values[i.item_id]));

  const save = async () => {
    setSaving(true);
    let okCount = 0;
    const next = {};
    for (const item of entries) {
      try {
        const data = await saveTargetSales(item.item_id, Number(values[item.item_id]), 'set');
        next[item.item_id] = { ok: true, previous: data?.previous_stock, stock: data?.stock ?? Number(values[item.item_id]) };
        okCount++;
      } catch (e) {
        next[item.item_id] = { ok: false, message: e.message };
      }
    }
    setResults(next);
    setSaving(false);
    if (okCount) {
      toast(`목표 판매량 ${okCount}건이 저장되었습니다.`);
      onSaved?.();
    }
    if (okCount < entries.length) toast('일부 메뉴를 저장하지 못했어요. 메뉴별 메시지를 확인하세요.', 'error');
  };

  return (
    <section className="card target-card" aria-labelledby="target-sales-title">
      <div className="card-head">
        <div>
          <h2 id="target-sales-title">오늘 목표 판매량</h2>
          <p className="card-sub">메뉴별 목표를 저장하면 Hi-An이 현재 재료로 달성할 수 있는지 다시 분석해요.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={save} disabled={saving || entries.length === 0 || invalid}>
          {saving ? '저장 중...' : '목표 판매량 저장'}
        </button>
      </div>
      <div className="target-grid">
        {TARGET_SALES_ITEMS.map((item) => {
          const v = values[item.item_id] ?? '';
          const r = results[item.item_id];
          const bad = v !== '' && !isValid(v);
          return (
            <div key={item.item_id} className="target-field">
              <label htmlFor={`target-${item.item_id}`}>{item.name}</label>
              <div className={`input-suffix${bad ? ' is-invalid' : ''}`}>
                <input
                  id={`target-${item.item_id}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={v}
                  onChange={(e) => {
                    setValues((s) => ({ ...s, [item.item_id]: e.target.value }));
                    setResults((s) => ({ ...s, [item.item_id]: undefined }));
                  }}
                  aria-invalid={bad}
                />
                <span>개</span>
              </div>
              {bad && <p className="field-msg is-error">0 이상의 정수로 입력하세요.</p>}
              {r?.ok && (
                <p className="field-msg is-ok">
                  {r.previous != null ? `${r.previous}에서 ${r.stock}(으)로 저장됨` : `${r.stock}(으)로 저장됨`}
                </p>
              )}
              {r && !r.ok && <p className="field-msg is-error">{r.message}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
