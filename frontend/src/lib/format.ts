export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
export function minutes(seconds: number): string {
  return seconds >= 60 ? `${(seconds / 60).toFixed(1)} min` : `${Math.round(seconds)} sec`;
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
