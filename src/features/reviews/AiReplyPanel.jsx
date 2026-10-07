import AiBadge from '../../components/AiBadge';
import Icon from '../../components/Icon';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';

export const REPLY_PARTS = [
  { key: 'greeting', field: 'greetings', title: '인삿말' },
  { key: 'body', field: 'bodies', title: '본문' },
  { key: 'closing', field: 'closings', title: '마무리' },
];

/**
 * 답변 작성 — 인삿말 / 본문 / 마무리에서 하나씩 고르면 초안이 자동으로 합쳐집니다.
 * reco: { status, data: { greetings, bodies, closings }, error }
 * picks: { greeting: index|null, body: index|null, closing: index|null }
 */
export default function AiReplyPanel({ review, reco, picks, onPick, draft, onDraftChange, onRetry, onSubmit, onClose, submitting }) {
  const id = review.review_id;

  return (
    <div className="reply-panel">
      <div className="reply-panel-head">
        <AiBadge>Hi-An AI 답변 작성</AiBadge>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="답변 작성 닫기">
          <Icon name="close" size={16} />
        </button>
      </div>

      {reco.status === 'loading' && <LoadingState message="Hi-An이 리뷰에 맞는 답변을 작성하고 있어요..." compact />}

      {reco.status === 'error' && (
        <EmptyState variant="error" title="답변을 추천하지 못했어요" description={reco.error} onRetry={onRetry} retryLabel="다시 추천받기" />
      )}

      {reco.status === 'success' && (
        <>
          <p className="compose-hint">영역마다 문장을 하나씩 고르면 아래 답변 초안이 자동으로 완성돼요.</p>

          {REPLY_PARTS.map((part, stepIndex) => {
            const options = reco.data?.[part.field] ?? [];
            return (
              <fieldset key={part.key} className="compose-step">
                <legend>
                  <span className="step-num" aria-hidden="true">
                    {stepIndex + 1}
                  </span>
                  {part.title}
                </legend>
                {options.length === 0 ? (
                  <p className="muted">추천 문장이 없어요. 초안에 직접 작성하세요.</p>
                ) : (
                  <div className="option-grid">
                    {options.map((text, i) => {
                      const selected = picks[part.key] === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`option-card${selected ? ' is-selected' : ''}`}
                          aria-pressed={selected}
                          onClick={() => onPick(part.key, i)}
                        >
                          <span className="option-check" aria-hidden="true">
                            {selected && <Icon name="check" size={13} strokeWidth={2.6} />}
                          </span>
                          <span>{text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            );
          })}

          <div className="reply-editor">
            <label htmlFor={`reply-${id}`}>답변 초안</label>
            <textarea
              id={`reply-${id}`}
              rows={5}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="위에서 문장을 고르거나 직접 작성하세요. 합쳐진 초안도 자유롭게 고칠 수 있어요."
            />
            <div className="reply-editor-foot">
              <span className="muted">{draft.length}자 · 문장 선택을 바꾸면 초안이 다시 합쳐져요</span>
              <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={!draft.trim() || submitting}>
                {submitting ? '등록 중...' : '답변 등록'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
