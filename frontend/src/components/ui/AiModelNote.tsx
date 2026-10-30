// SEMENTARA: menampilkan model AI yang dipakai, untuk fase uji. Hapus komponen ini (dan pemakaiannya) sebelum final.
export function AiModelNote({ source, model }: { source?: string; model?: string | null }) {
  const text = source === "llm" ? `AI model: ${model ?? "unknown"}` : "AI model: none (basic tips, LLM unavailable)";
  return <p className="mt-1 text-[11px] muted">[temp] {text}</p>;
}
