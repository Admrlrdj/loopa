export function StatCard({ label, value, unit, hint, icon, tint }: { label: string; value: string | number; unit?: string; hint: string; icon: React.ReactNode; tint?: boolean }) {
  return (
    <div className="stat-card" style={tint ? { background: "#f3ecff", borderColor: "#e1d8f5" } : undefined}>
      <div>
        <p className="eyebrow" style={{ color: "var(--brand)" }}>{label}</p>
        <p className="num">{value}{unit && <span className="ml-1 text-sm font-medium muted">{unit}</span>}</p>
        <p className="mt-1 text-xs muted">{hint}</p>
      </div>
      <span className="stat-icon" aria-hidden>{icon}</span>
    </div>
  );
}
