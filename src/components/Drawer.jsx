import { useRef } from 'react';
import Icon from './Icon';
import useOverlay from './useOverlay';

/**
 * 우측 Drawer — Esc / 배경 클릭으로 닫힘, 열릴 때 포커스 이동, 닫히면 원래 위치로 포커스 복귀
 */
export default function Drawer({ open, onClose, title, headerExtra, children }) {
  const panelRef = useRef(null);

  useOverlay(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={panelRef}>
        <header className="drawer-head">
          <div className="drawer-title">
            <h2 id="drawer-title">{title}</h2>
            {headerExtra}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
