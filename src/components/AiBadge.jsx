import Icon from './Icon';

/** AI 결과 영역 표시용 작은 배지 */
export default function AiBadge({ children = 'Hi-An AI' }) {
  return (
    <span className="ai-badge">
      <Icon name="sparkle" size={13} strokeWidth={2} />
      {children}
    </span>
  );
}
