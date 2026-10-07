import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { saveResourceStock } from '../../api/inventory';
import { useToast } from '../../components/Toast';
import { formatQty } from '../../config/inventoryLabels';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const makeResourceId = () => `RES_CUSTOM_${Date.now()}`;

export default function ResourceInputModal({ open, resources, onClose, onSaved }) {
  const toast = useToast();
  const [mode, setMode] = useState('existing');
  const [resourceId, setResourceId] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('g');
  const [value, setValue] = useState('');
  const [expiration, setExpiration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(
    () => resources.find((r) => r.resource_id === resourceId) || null,
    [resources, resourceId],
  );

  useEffect(() => {
    if (!open) return;
    const first = resources[0] || null;
    setMode('existing');
    setResourceId(first?.resource_id || '');
    setNewName('');
    setNewUnit('g');
    setValue('');
    setExpiration('');
    setError('');
  }, [open, resources]);

  const changeResource = (id) => {
    setResourceId(id);
    setValue('');
    setExpiration('');
    setError('');
  };

  const valueStr = String(value).trim();
  const valueOk = valueStr !== '' && Number.isFinite(Number(valueStr)) && Number(valueStr) >= 0;
  const dateOk = expiration === '' || DATE_RE.test(expiration);
  const identityOk = mode === 'existing' ? Boolean(resourceId) : Boolean(newName.trim());
  const canSubmit = identityOk && valueOk && dateOk && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const isNew = mode === 'new';
      await saveResourceStock({
        action: 'set',
        resource_id: isNew ? makeResourceId() : resourceId,
        name: isNew ? newName.trim() : undefined,
        unit: isNew ? newUnit.trim() || 'g' : undefined,
        value: Number(valueStr),
        expiration_date: expiration || undefined,
      });
      toast(isNew ? '새 재료가 저장되었습니다.' : '재료 정보가 저장되었습니다.');
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || '재료 정보를 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title="재료 입력"
      description="기존 재료는 현재 값을 확인한 뒤 새 값으로 덮어쓸 수 있고, 새 재료도 추가할 수 있어요."
      className="resource-input-modal"
      footer={
        <button type="submit" form="resource-input-form" className="btn btn-primary" disabled={!canSubmit}>
          {saving ? '저장 중...' : '저장'}
        </button>
      }
    >
      <form id="resource-input-form" className="resource-input-form" onSubmit={submit}>
        <div className="resource-mode-tabs" role="tablist" aria-label="재료 입력 방식">
          <button type="button" className={`resource-mode-tab${mode === 'existing' ? ' is-active' : ''}`} onClick={() => setMode('existing')}>기존 재료 수정</button>
          <button type="button" className={`resource-mode-tab${mode === 'new' ? ' is-active' : ''}`} onClick={() => setMode('new')}>새 재료 입력</button>
        </div>

        {mode === 'existing' ? (
          <>
            <div className="form-field">
              <label htmlFor="resource-input-select">재료 선택</label>
              <select id="resource-input-select" className="text-input" value={resourceId} onChange={(e) => changeResource(e.target.value)}>
                {resources.map((r) => <option key={r.resource_id} value={r.resource_id}>{r.name}</option>)}
              </select>
            </div>

            {selected && (
              <div className="resource-current-box">
                <strong>현재 등록값</strong>
                <div><span>현재 수량</span><b>{formatQty(selected.stock, selected.unit)}</b></div>
                <div><span>유통기한</span><b>{selected.expiration_date || '미등록'}</b></div>
              </div>
            )}
          </>
        ) : (
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="resource-new-name">새 재료명</label>
              <input id="resource-new-name" className="text-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="예: 후추" />
            </div>
            <div className="form-field">
              <label htmlFor="resource-new-unit">단위</label>
              <input id="resource-new-unit" className="text-input" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="g, kg, ea 등" />
            </div>
          </div>
        )}

        <div className="resource-new-values">
          <strong>{mode === 'existing' ? '새 값 입력' : '재료 정보 입력'}</strong>
          <p>{mode === 'existing' ? '아래에 입력한 값으로 기존 값이 덮어써집니다.' : '새 재료의 수량과 유통기한을 입력하세요.'}</p>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="resource-input-value">수량</label>
            <div className={`input-suffix${valueStr !== '' && !valueOk ? ' is-invalid' : ''}`}>
              <input id="resource-input-value" type="number" min="0" step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="새 수량 입력" />
              <span>{mode === 'existing' ? (selected?.unit || '') : (newUnit || '')}</span>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="resource-input-exp">유통기한</label>
            <input id="resource-input-exp" type="date" className={`text-input${!dateOk ? ' is-invalid' : ''}`} value={expiration} onChange={(e) => setExpiration(e.target.value)} />
          </div>
        </div>

        {!valueOk && valueStr !== '' && <p className="field-msg is-error">수량은 0 이상의 숫자로 입력하세요.</p>}
        {!dateOk && <p className="field-msg is-error">유통기한은 YYYY-MM-DD 형식이어야 합니다.</p>}
        {error && <p className="field-msg is-error">{error}</p>}
      </form>
    </Modal>
  );
}
