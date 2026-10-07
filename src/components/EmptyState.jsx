import Icon from './Icon';

/** 빈 데이터 / 오류 공통. variant="error"면 경고 아이콘과 재시도 버튼 */
export default function EmptyState({ title, description, variant = 'empty', onRetry, retryLabel = '다시 불러오기' }) {
  const isError = variant === 'error';
  return (
    <div className={`state-box${isError ? ' is-error' : ''}`} role={isError ? 'alert' : undefined}>
      <span className="state-icon">
        <Icon name={isError ? 'alert' : 'inbox'} size={20} />
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={15} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
