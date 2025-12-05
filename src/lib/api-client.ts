import { ApiResponse } from "../../shared/types"

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: RequestInit['body'] | FormData;
  skipContentType?: boolean;
}

export async function api<T>(path: string, init?: ApiOptions): Promise<T> {
  const { skipContentType, ...fetchInit } = init || {};

  const headers: HeadersInit = skipContentType
    ? { ...fetchInit.headers }
    : { 'Content-Type': 'application/json', ...fetchInit.headers };

  const res = await fetch(path, { ...fetchInit, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success || json.data === undefined) throw new Error(json.error || 'Request failed');
  return json.data;
}