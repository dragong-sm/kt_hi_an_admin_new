/**
 * 최소 라우터 — 화면이 2개뿐이라 외부 라우터 의존성 없이 History API만 사용합니다.
 * 같은 메뉴를 다시 눌러도 refreshKey를 올려 해당 화면이 최신 데이터를 다시 불러올 수 있게 합니다.
 * (Vercel SPA 새로고침 대응은 vercel.json rewrites 참고)
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const RouterContext = createContext({ path: '/', navigate: () => {}, refreshKey: 0 });

export function RouterProvider({ children }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname);
      setRefreshKey((v) => v + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (to === window.location.pathname) {
      setRefreshKey((v) => v + 1);
      window.scrollTo(0, 0);
      return;
    }
    window.history.pushState({}, '', to);
    setPath(to);
    setRefreshKey((v) => v + 1);
    window.scrollTo(0, 0);
  }, []);

  return <RouterContext.Provider value={{ path, navigate, refreshKey }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

export function Link({ to, children, ...rest }) {
  const { navigate } = useRouter();
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
