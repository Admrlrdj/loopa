// Cermin backend/app/schemas/models.py
export type DrowsinessStatus = "NORMAL" | "POSSIBLE_DROWSINESS" | "DROWSY_NEED_REST" | "UNCERTAIN";
export type AlertAction = "ACKNOWLEDGE" | "CONTINUE" | "END_SESSION";

export type Mood = "good" | "okay" | "tough";
export interface SessionOut { id: string; status: string; configured_study_seconds: number; configured_break_seconds: number; started_at: string; title: string; mandatory_break: boolean; soundtrack: string | null }
export interface BlockOut { id: string; session_id: string; sequence_number: number; planned_duration_seconds: number; started_at: string; status: string }
export interface BreakOut { id: string; session_id: string; planned_duration_seconds: number; started_at: string; status: string }
export interface AlertOut { id: string; level: number; type: string; requires_response: boolean; actions: AlertAction[] }
export interface PredictResponse {
  session_id: string; block_id: string | null; status: DrowsinessStatus; drowsiness_score: number;
  face_detected: boolean; blink_count: number; yawn_count: number; eye_closure_count: number;
  alert: AlertOut | null; timer_paused: boolean;
}
export interface AlertRespondResponse { alert_id: string; action: AlertAction; already_processed: boolean; show_advice: boolean; advice: string[]; session_ended: boolean }
export interface SessionEvent { id: string; timestamp: string; event_type: string; block_id: string | null; duration_seconds: number | null; metadata: Record<string, unknown> }
export interface SummaryOut {
  session_id: string; status: string; title: string; reflection: Mood | null; started_at: string | null; end_reason: string | null; total_study_seconds: number; total_break_seconds: number;
  total_pause_seconds: number; blocks_completed: number; blocks_stopped_early: number; blink_count: number; yawn_count: number;
  eye_closure_count: number; estimated_drowsy_seconds: number; alert_1_count: number; alert_2_count: number; events: SessionEvent[];
}
export interface SessionListItem {
  id: string; title: string; reflection: Mood | null; status: string; started_at: string; ended_at: string | null; end_reason: string | null;
  total_study_seconds: number; total_break_seconds: number; estimated_drowsy_seconds: number; blink_count: number;
  yawn_count: number; eye_closure_count: number; alert_1_count: number; alert_2_count: number;
}
export interface SessionListOut { items: SessionListItem[]; limit: number; offset: number }
export interface InsightOut { source: string; text: string; model?: string | null }

export interface DayStat { date: string; focus_minutes: number; sessions: number; alerts: number }
export interface StatsOut {
  days: number; sessions: number; total_focus_seconds: number; total_break_seconds: number; alerts: number;
  avg_session_minutes: number; drowsy_share_pct: number; current_streak_days: number;
  mood_counts: Record<string, number>; per_day: DayStat[]; insight: string;
}
export interface MeOut { authenticated: boolean; user_id: string | null; email: string | null; auth_enabled: boolean; auth_required: boolean }
export interface HealthOut {
  status: string; inference_backend: string; persistence: boolean;
  auth?: { enabled: boolean; required: boolean };
  llm?: { enabled: boolean; model: string; fallbacks: string[] };
}
