/**
 * localStorage 캐시 (stale-while-revalidate)
 * - 캐시는 화면을 빨리 띄우기 위한 임시 값입니다. 화면에 먼저 보여준 뒤 실제 API로 최신 값을 교체합니다.
 * - 기본 호출은 같은 요청을 공유하고 5초 내 최신값을 재사용합니다. (첫 접속 미리 불러오기 최적화)
 * - force=true 호출은 화면 재진입/사용자 갱신용으로 recent/inflight를 우회해 실제 API를 다시 호출합니다.
 * - 데이터를 변경한 뒤에는 invalidate()로 캐시를 지우고 새로 불러옵니다.
 */
const PREFIX = 'hian-admin:cache:v1:';
const inflight = new Map(); // key → { promise, version }
const versions = new Map(); // key → 최신 요청 번호
const recent = new Map(); // key → { at, data } 방금 받은 최신 값 (중복 호출 방지)
const RECENT_MS = 5000;

export const CACHE_KEYS = { resources: 'resources', reviews: 'reviews' };

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw).data : null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* 저장 공간 부족 등 — 캐시 없이 동작 */
  }
}

/** 캐시 삭제 + 진행 중이던 요청 결과는 버리도록 표시 */
export function invalidate(key) {
  versions.set(key, (versions.get(key) || 0) + 1);
  inflight.delete(key);
  recent.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* 무시 */
  }
}

/**
 * 실제 API 호출 → 성공하면 캐시 갱신.
 * 기본 호출은 진행 중 요청/5초 내 최신값을 재사용합니다.
 * force=true면 반드시 새 네트워크 요청을 실행합니다.
 */
export function fetchFresh(key, fetcher, { force = false } = {}) {
  if (!force) {
    const running = inflight.get(key);
    if (running) return running.promise;
    const last = recent.get(key);
    if (last && Date.now() - last.at < RECENT_MS) return Promise.resolve(last.data);
  }

  const version = (versions.get(key) || 0) + 1;
  versions.set(key, version);
  const promise = fetcher()
    .then((data) => {
      if (versions.get(key) === version) {
        writeCache(key, data);
        recent.set(key, { at: Date.now(), data });
      }
      return data;
    })
    .finally(() => {
      if (inflight.get(key)?.version === version) inflight.delete(key);
    });

  // force 요청은 기존 inflight를 재사용하지 않지만, 이후 일반 호출은 이 최신 요청을 공유할 수 있게 등록합니다.
  inflight.set(key, { promise, version });
  return promise;
}
