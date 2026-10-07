import { useState } from 'react';

/**
 * Hi-An 로고 — public/assets/hi-an-logo.png 를 사용합니다.
 * 파일이 아직 없으면 텍스트 워드마크로 대체 표시합니다. (새 로고를 만들지 않음)
 */
export const LOGO_SRC = '/assets/hi-an-logo.png';

/** 이미지 크기는 CSS(.logo-img)에서 지정합니다. height는 대체 텍스트 크기용입니다. */
export default function Logo({ height = 32, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`logo-fallback ${className}`} style={{ fontSize: height * 0.72 }} aria-label="Hi-An">
        Hi-An
      </span>
    );
  }
  return (
    <img
      className={`logo-img ${className}`}
      src={LOGO_SRC}
      alt="Hi-An"
      onError={() => setFailed(true)}
    />
  );
}
