import { supabase } from "@/lib/supabase";
import type * as T from "@/types/api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Error HTTP dari backend; status dipakai untuk membedakan sesi hilang (404) dari gangguan jaringan. */
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function req<R>(path: string, init?: RequestInit): Promise<R> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(await authHeader()), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail: unknown = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* body bukan JSON */ }
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }
  return res.json() as Promise<R>;
}
const post = <R>(path: string, body?: unknown) =>
  req<R>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export interface SessionSetup { study: number; brk: number; title: string; mandatoryBreak: boolean; soundtrack: string | null }

export const api = {
  health: () => req<T.HealthOut>("/health"),
  me: () => req<T.MeOut>("/me"),
  createSession: (c: SessionSetup) =>
    post<T.SessionOut>("/sessions", {
      configured_study_seconds: c.study, configured_break_seconds: c.brk, title: c.title,
      mandatory_break: c.mandatoryBreak, soundtrack: c.soundtrack,
    }),
  startBlock: (sid: string) => post<T.BlockOut>(`/sessions/${sid}/blocks`),
  completeBlock: (sid: string, bid: string) => post(`/sessions/${sid}/blocks/${bid}/complete`),
  pauseBlock: (sid: string, bid: string) => post(`/sessions/${sid}/blocks/${bid}/pause`),
  resumeBlock: (sid: string, bid: string) => post(`/sessions/${sid}/blocks/${bid}/resume`),
  startBreak: (sid: string) => post<T.BreakOut>(`/sessions/${sid}/breaks`),
  completeBreak: (sid: string, brid: string) => post(`/sessions/${sid}/breaks/${brid}/complete`),
  predict: (sid: string, imageB64: string, requestId: string) =>
    post<T.PredictResponse>(`/sessions/${sid}/predict`, { image_b64: imageB64, request_id: requestId, client_ts: new Date().toISOString() }),
  respondAlert: (sid: string, aid: string, action: T.AlertAction) =>
    post<T.AlertRespondResponse>(`/sessions/${sid}/alerts/${aid}/respond`, { action }),
  endSession: (sid: string, reason: string) => post<T.SummaryOut>(`/sessions/${sid}/end`, { reason }),
  summary: (sid: string) => req<T.SummaryOut>(`/sessions/${sid}/summary`),
  insights: (sid: string) => post<T.InsightOut>(`/sessions/${sid}/insights`),
  breakTip: (sid: string) => post<T.InsightOut>(`/sessions/${sid}/break-tip`),
  reflection: (sid: string, mood: T.Mood) => post(`/sessions/${sid}/reflection`, { mood }),
  list: (limit = 20) => req<T.SessionListOut>(`/sessions?limit=${limit}`),
  stats: (days = 14) => req<T.StatsOut>(`/stats?days=${days}`),
};
