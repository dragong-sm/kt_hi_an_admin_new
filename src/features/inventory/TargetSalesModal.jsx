import { useCallback, useEffect, useRef, useState } from 'react';
import { getTargetSalesItems, saveTargetSales } from '../../api/inventory';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';

const normalizeNumber = (v) => String(v).replace(/\D/g, '').replace(/^0+(?=\d)/, '');

export default function TargetSalesModal({ open, onClose, onSaved }) {
  const toast = useToast();
  const [current, setCurrent] = useState({ status: 'loading', items: [], error: null });
  const [editing, setEditing] = useState({});
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const successTimer = useRef(null);

  const loadCurrent = useCallback(async () => {
    setCurrent((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const items = await getTargetSalesItems();
      setCurrent({ status: 'success', items, error: null });
    } catch (e) {
      setCurrent({ status: 'error', items: [], error: e.message });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setEditing({});
    setValues({});
    setErrors({});
    loadCurrent();
  }, [open, loadCurrent]);

  useEffect(() => () => clearTimeout(successTimer.current), []);

  const showSuccess = () => {
    clearTimeout(successTimer.current);
    setSuccessOpen(true);
    successTimer.current = setTimeout(() => setSuccessOpen(false), 2600);
  };

  const entries = current.items.filter((i) => editing[i.item_id] && (values[i.item_id] ?? '') !== '');

  const startEdit = (item) => {
    setEditing((s) => ({ ...s, [item.item_id]: true }));
    setValues((s) => ({ ...s, [item.item_id]: String(item.stock ?? '') }));
  };

  const cancelEdit = (itemId) => {
    setEditing((s) => ({ ...s, [itemId]: false }));
    setValues((s) => ({ ...s, [itemId]: '' }));
    setErrors((s) => ({ ...s, [itemId]: undefined }));
  };

  const save = async () => {
    if (!entries.length) return;
    setSaving(true);
    const failed = {};
    for (const item of entries) {
      try {
        await saveTargetSales(item.item_id, Number(values[item.item_id]), 'set');
      } catch (e) {
        failed[item.item_id] = e.message;
      }
    }
    const okCount = entries.length - Object.keys(failed).length;
    setErrors(failed);
    setSaving(false);

    if (okCount) {
      onSaved?.();
      if (Object.keys(failed).length) {
        toast('일부 메뉴만 저장되었어요. 실패한 메뉴를 확인해 주세요.', 'error');
        loadCurrent();
      } else {
        onClose();
        showSuccess();
      }
    } else {
      toast('저장하지 못했어요. 메뉴별 메시지를 확인하세요.', 'error');
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={saving ? () => {} : onClose}
        className="target-sales-modal"
        title="오늘 목표 판매량"
        description="변경할 메뉴만 선택해서 오늘의 목표 판매량을 수정할 수 있어요."
        footer={
          <div className="target-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>닫기</button>
            <button type="button" className="btn btn-primary target-save-btn" onClick={save} disabled={saving || entries.length === 0 || current.status !== 'success'}>변경 내용 저장</button>
          </div>
        }
      >
        <div className="target-modal-guide">현재 목표량을 확인한 뒤 필요한 메뉴만 <strong>변경하기</strong>를 눌러 수정하세요.</div>

        {current.status === 'loading' ? (
          <div className="target-list-loading">목표 판매량을 불러오고 있어요...</div>
        ) : current.status === 'error' ? (
          <div className="target-list-error">
            <strong>목표 판매량을 불러오지 못했어요.</strong>
            <span>{current.error}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadCurrent}>다시 불러오기</button>
          </div>
        ) : (
          <ul className="target-list">
            {current.items.map((item) => {
              const isEditing = Boolean(editing[item.item_id]);
              return (
                <li key={item.item_id} className={`target-row${isEditing ? ' is-editing' : ''}`}>
                  <span className="target-name">{item.name}</span>
                  <div className="target-current-block">
                    <span className="target-label">현재</span>
                    <span className="target-current"><strong>{item.stock ?? 0}개</strong></span>
                  </div>
                  <div className="target-edit-area">
                    {!isEditing ? (
                      <button type="button" className="btn btn-secondary btn-sm target-edit-btn" onClick={() => startEdit(item)}>변경하기</button>
                    ) : (
                      <>
                        <label className="target-change" htmlFor={`target-${item.item_id}`}>
                          <span className="sr-only">{item.name} 변경 목표량</span>
                          <span className="input-suffix">
                            <input id={`target-${item.item_id}`} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={values[item.item_id] ?? ''} onChange={(e) => {
                              setValues((s) => ({ ...s, [item.item_id]: normalizeNumber(e.target.value) }));
                              setErrors((s) => ({ ...s, [item.item_id]: undefined }));
                            }} />
                            <span>개</span>
                          </span>
                        </label>
                        <button type="button" className="target-cancel-btn" onClick={() => cancelEdit(item.item_id)}>취소</button>
                      </>
                    )}
                  </div>
                  {errors[item.item_id] && <p className="field-msg target-msg is-error">{errors[item.item_id]}</p>}
                </li>
              );
            })}
          </ul>
        )}

        {saving && (
          <div className="target-saving-overlay" role="status" aria-live="polite">
            <span className="target-saving-spinner" aria-hidden="true" />
            <strong>변경 내용을 저장하고 있어요</strong>
            <span>잠시만 기다려 주세요.</span>
          </div>
        )}
      </Modal>

      <Modal open={successOpen} onClose={() => setSuccessOpen(false)} className="target-success-modal" title="저장 완료">
        <div className="target-success" role="status">
          <div className="target-success-icon">✓</div>
          <strong>오늘 목표판매량이 수정되었습니다</strong>
          <p>변경된 목표를 기준으로 재고를 다시 분석할게요.</p>
        </div>
      </Modal>
    </>
  );
}
