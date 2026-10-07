import { N8N_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR') {
    super(message);
    this.code = code;
  }
}

/**
 * n8n Webhook 직접 호출 (공통)
 * - POST·PUT: JSON body + Content-Type: application/json
 * - GET: query parameter만 사용 (body·Content-Type 없음)
 * 응답이 { success, data, error } 형식이면 data를, data가 없는 { success, ... } 형식이면 응답 전체를 반환합니다.
 * 실패면 error.message로 ApiError를 던집니다.
 */
export async function request(endpoint, { method = 'POST', body, query } = {}) {
  const url = new URL(N8N_BASE_URL + endpoint);
  for (const [k, v] of Object.entries(query ?? {})) if (v != null && v !== '') url.searchParams.set(k, v);

  const init = method === 'GET' ? { method } : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) };

  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('n8n 서버에 연결하지 못했습니다. 네트워크 또는 n8n CORS 설정을 확인하세요.', 'NETWORK_ERROR');
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* JSON 아님 */
  }
  if (Array.isArray(json) && json.length === 1 && typeof json[0]?.success === 'boolean') json = json[0];

  const error = json?.error;
  if (!res.ok) throw new ApiError(error?.message || json?.message || `n8n 오류 (HTTP ${res.status})`, error?.code || `HTTP_${res.status}`);
  if (json === null) throw new ApiError(text ? 'n8n 응답이 JSON이 아닙니다.' : 'n8n이 빈 응답을 보냈습니다.', 'INVALID_RESPONSE');
  if (typeof json.success !== 'boolean') return json;
  if (!json.success) throw new ApiError(error?.message || (typeof error === 'string' ? error : '요청을 처리하지 못했습니다.'), error?.code);
  return 'data' in json ? json.data : json;
}

export const post = (endpoint, body) => request(endpoint, { method: 'POST', body });
export const put = (endpoint, body) => request(endpoint, { method: 'PUT', body });
export const get = (endpoint, query) => request(endpoint, { method: 'GET', query });
