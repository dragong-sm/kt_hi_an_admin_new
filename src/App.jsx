import { lazy, Suspense, useEffect } from 'react';
import { RouterProvider, useRouter, Link } from './router';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import EmptyState from './components/EmptyState';
import LoadingState from './components/LoadingState';
import InventoryPage from './pages/InventoryPage';
import { fetchResources } from './api/inventory';
import { fetchReviews } from './api/reviews';

// 리뷰 화면은 필요할 때만 불러와 첫 화면 로딩을 가볍게 함
const ReviewPage = lazy(() => import('./pages/ReviewPage'));

const ROUTES = { '/': InventoryPage, '/inventory': InventoryPage, '/reviews': ReviewPage };

function NotFound() {
  return (
    <div className="page">
      <EmptyState title="페이지를 찾을 수 없어요" description="주소를 확인하거나 왼쪽 메뉴에서 이동하세요." />
      <p className="center-link">
        <Link to="/inventory">재고 관리로 이동</Link>
      </p>
    </div>
  );
}

function Routes() {
  const { path } = useRouter();
  const Page = ROUTES[path.replace(/\/+$/, '') || '/'] || NotFound;
  return (
    <Suspense fallback={<LoadingState />}>
      <Page />
    </Suspense>
  );
}

export default function App() {
  // 첫 접속 시 재료 목록·리뷰 목록을 동시에 미리 불러와 localStorage 캐시에 저장 (화면 진입 요청과 공유)
  useEffect(() => {
    fetchResources().catch(() => {});
    fetchReviews().catch(() => {});
  }, []);

  return (
    <RouterProvider>
      <ToastProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="app-main">
            <Routes />
          </main>
        </div>
      </ToastProvider>
    </RouterProvider>
  );
}
