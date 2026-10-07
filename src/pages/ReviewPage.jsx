import { useCallback, useEffect, useRef, useState } from 'react';
import { cachedReviews, fetchReviews, invalidateReviews } from '../api/reviews';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ReviewCard from '../features/reviews/ReviewCard';
import { useRouter } from '../router';

const EMPTY = { reviews: [], total: null, averageRating: null };

/**
 * 리뷰 관리 — review-list (응답 순서 그대로 표시), AI 답변 생성 review-generate, 답변 저장 owner-review-response
 * localStorage 캐시가 있으면 먼저 보여주고, 실제 API로 다시 불러와 교체합니다. (stale-while-revalidate)
 */
export default function ReviewPage() {
  const [state, setState] = useState(() => {
    const cached = cachedReviews();
    return cached ? { status: 'success', ...cached, error: null } : { status: 'loading', ...EMPTY, error: null };
  });
  const seq = useRef(0);
  const { refreshKey } = useRouter();

  const load = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => (s.status === 'success' ? s : { ...s, status: 'loading', error: null }));
    try {
      const data = await fetchReviews({ force: true });
      if (id !== seq.current) return;
      setState({ status: 'success', ...data, error: null, staleError: null });
    } catch (e) {
      if (id !== seq.current) return;
      setState((s) => (s.status === 'success' ? { ...s, staleError: e.message } : { status: 'error', ...EMPTY, error: e.message }));
    }
  }, []);

  /** 답변 저장 후: 캐시 무효화 → 다시 불러오기 */
  const handleReplySaved = useCallback(() => {
    invalidateReviews();
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const { status, reviews, total, averageRating, error, staleError, responsesError } = state;
  const ready = status === 'success';

  return (
    <div className="page">
      <PageHeader title="리뷰 관리" description="고객 리뷰를 확인하고 Hi-An AI가 답변을 추천합니다." />

      <div className="stat-grid cols-2">
        <StatCard label="전체 리뷰" value={ready ? total : null} unit="개" />
        <StatCard label="평균 평점" value={ready ? averageRating : null} unit="/ 5" hint={ready && averageRating == null ? '평점 없음' : undefined} />
      </div>

      <section className="card" aria-labelledby="review-list-title">
        <div className="card-head">
          <h2 id="review-list-title">고객 리뷰</h2>
        </div>

        {staleError && (
          <p className="field-msg card-alert muted-note">최신 리뷰를 불러오지 못해 마지막으로 저장된 정보를 보여주고 있어요. ({staleError})</p>
        )}
        {responsesError && <p className="field-msg card-alert muted-note">사장님 답변을 불러오지 못했어요. ({responsesError})</p>}
        {status === 'loading' && <LoadingState message="고객 리뷰를 불러오고 있어요..." />}
        {status === 'error' && (
          <EmptyState variant="error" title="리뷰를 불러오지 못했습니다." description={error} onRetry={load} retryLabel="다시 불러오기" />
        )}
        {ready && reviews.length === 0 && <EmptyState title="아직 등록된 리뷰가 없습니다." />}
        {ready && reviews.length > 0 && (
          <div className="review-list">
            {reviews.map((r) => (
              <ReviewCard key={r.review_id} review={r} onSaved={handleReplySaved} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
