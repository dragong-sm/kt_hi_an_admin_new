import { useEffect, useRef } from 'react';
import Icon from './Icon';

/** 가운데 모달 — Esc / 배경 클릭으로 닫힘, 닫히면 원래 위치로 포커스 복귀 */
export default function Modal({ open, onClose, title, description, footer, children, className = '' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-root">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className={`modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={panelRef}>
        <header className="drawer-head">
          <div>
            <h2 id="modal-title" className="modal-title">{title}</h2>
            {description && <p className="card-sub">{description}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}
