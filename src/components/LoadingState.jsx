export default function LoadingState({ message = '불러오는 중이에요...', compact = false }) {
  return (
    <div className={`state-box${compact ? ' is-compact' : ''}`} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
