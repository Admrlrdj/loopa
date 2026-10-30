export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
/** Seperti Figma: "24 : 36". */
export function mmssSpaced(totalSeconds: number): string {
  return mmss(totalSeconds).replace(":", " : ");
}
export function minutes(seconds: number): string {
  return seconds >= 60 ? `${(seconds / 60).toFixed(1)} min` : `${Math.round(seconds)} sec`;
}
/** "2h 30m" / "45m" / "0m" untuk kartu statistik. */
export function hm(seconds: number): { value: string; unit: string } {
  const m = Math.round(seconds / 60);
  if (m >= 60) return { value: `${Math.floor(m / 60)}h ${m % 60}m`, unit: "" };
  return { value: String(m), unit: "min" };
}
export const STATUS_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  POSSIBLE_DROWSINESS: "Possible drowsiness",
  DROWSY_NEED_REST: "Drowsy — needs a break",
  UNCERTAIN: "Uncertain / no face detected",
};
export const END_REASON_LABEL: Record<string, string> = {
  MANUAL: "Ended manually",
  ENDED_AFTER_SECOND_ALERT: "Ended after second alert",
  COMPLETED: "Completed",
};
export const END_REASON_LONG: Record<string, string> = {
  MANUAL: "Session ended by you",
  ENDED_AFTER_SECOND_ALERT: "Ended after a drowsiness check-in",
  COMPLETED: "Session completed",
};

export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
