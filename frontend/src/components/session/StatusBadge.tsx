import { STATUS_LABEL } from "@/lib/format";

const COLORS: Record<string, string> = {
  NORMAL: "#2e7d4f", POSSIBLE_DROWSINESS: "#b26a00", DROWSY_NEED_REST: "#b4234f", UNCERTAIN: "#6b6489", OFF: "#6b6489",
};

export function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? "OFF";
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ background: COLORS[key] }}>
      {status ? STATUS_LABEL[status] ?? status : "Monitoring off"}
    </span>
  );
}
