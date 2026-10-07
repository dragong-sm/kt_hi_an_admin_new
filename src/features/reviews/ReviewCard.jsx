import { useState } from 'react';
import { generateReview, saveOwnerReviewResponse } from '../../api/reviews';
import { useToast } from '../../components/Toast';
import Icon from '../../components/Icon';
import Stars from './Stars';
import AiReplyPanel, { REPLY_PARTS } from './AiReplyPanel';

const EMPTY_PICKS = { greeting: null, body: null, closing: null };

/** 선택한 인삿말·본문·마무리를 줄바꿈으로 합칩니다. */
const composeDraft = (picks, data) =>
  REPLY_PARTS.map((p) => (picks[p.key] == null ? null : data?.[p.field]?.[picks[p.key]]))
    .filter(Boolean)
    .join('\n');

/**
 * review: { review_id, nickname, recent_order_menu, review_question, review_answer, rating, owner_response }
 * 표시: 닉네임 | 별점 → 최근 주문 → 질문·답변 → 사장님 답변(있을 때만)
 * review_id는 API 호출에만 쓰고 화면에는 표시하지 않음
 */
export default function ReviewCard({ review, onSaved }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reco, setReco] = useState({ status: 'idle', data: null, error: null });
  const [picks, setPicks] = useState(EMPTY_PICKS);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedReply, setSavedReply] = useState('');
  const ownerReply = savedReply || review.owner_response;

  const recommend = async () => {
    if (reco.status === 'loading') return;
    setOpen(true);
    setPicks(EMPTY_PICKS);
    setDraft('');
    setReco({ status: 'loading', data: null, error: null });
    try {
      setReco({ status: 'success', data: await generateReview(review), error: null });
    } catch (e) {
      setReco({ status: 'error', data: null, error: e.message });
    }
  };

  const pick = (partKey, index) => {
    const next = { ...picks, [partKey]: picks[partKey] === index ? null : index };
    setPicks(next);
    setDraft(composeDraft(next, reco.data));
  };

  const submit = async () => {
    const reply = draft.trim();
    if (!reply || saving) return;
    setSaving(true);
    try {
      await saveOwnerReviewResponse(review, reply);
      setSavedReply(reply);
      setOpen(false);
      toast('답변이 등록되었습니다.');
      onSaved?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={`review-card${open ? ' is-open' : ''}`}>
      <div className="review-main">
        <header className="review-head">
          <strong className="review-nick">{review.nickname || '비회원'}</strong>
          {Number.isFinite(review.rating) && (
            <>
              <span className="review-divider" aria-hidden="true" />
              <Stars rating={review.rating} />
            </>
          )}
          <span className="review-divider" aria-hidden="true" />
          <span className="review-menu">{review.menu_list.length ? review.menu_list.join(' · ') : '최근 주문 없음'}</span>
        </header>

        <dl className="review-qa">
          <dt>리뷰 질문</dt>
          <dd>{review.review_question || '—'}</dd>
          <dt>리뷰 응답</dt>
          <dd className="review-content">{review.review_answer || '—'}</dd>
        </dl>

        {ownerReply ? (
          <div className="owner-reply">
            <div className="owner-reply-head">
              <span>사장님의 리뷰답변</span>
              <div className="owner-reply-actions" aria-label="리뷰 답변 관리">
                <button type="button" className="owner-reply-action" disabled title="준비 중">수정</button>
                <button type="button" className="owner-reply-action is-danger" disabled title="준비 중">삭제</button>
              </div>
            </div>
            <p>{ownerReply}</p>
          </div>
        ) : (
          <div className="owner-reply is-empty">
            <p>아직 등록된 답변이 없습니다.</p>
            {!open && (
              <button type="button" className="btn btn-primary btn-sm" onClick={recommend} disabled={reco.status === 'loading'}>
                <Icon name="sparkle" size={15} strokeWidth={2} />
                AI 답변 작성
              </button>
            )}
          </div>
        )}
      </div>

      {open && (
        <AiReplyPanel
          review={review}
          reco={reco}
          picks={picks}
          onPick={pick}
          draft={draft}
          onDraftChange={setDraft}
          onRetry={recommend}
          onSubmit={submit}
          onClose={() => setOpen(false)}
          submitting={saving}
        />
      )}
    </article>
  );
}
