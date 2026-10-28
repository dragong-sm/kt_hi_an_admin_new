import { useEffect } from 'react';

/**
 * Drawer·Modal 공통 동작
 * - Esc로 닫기, 열려 있는 동안 배경 스크롤 잠금
 * - 열릴 때 패널로 포커스 이동, 닫히면 원래 위치로 포커스 복귀
 */
export default function useOverlay(open, onClose, panelRef) {
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose, panelRef]);
}
