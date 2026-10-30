"use client";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

function LoginInner() {
  const a = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (a.user) router.replace(next); }, [a.user, next, router]);

  async function google() { setBusy(true); setMsg(await a.signInWithGoogle()); setBusy(false); }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = mode === "signup" ? await a.signUpWithEmail(email, password, username) : await a.signInWithEmail(email, password);
    setMsg(err); setBusy(false);
  }
  const guest = () => { a.continueAsGuest(); router.replace(next); };

  return (
    <div className="page-wrap">
      <header className="px-6 pt-6">
        <Link href="/" className="inline-flex flex-col" aria-label="Loopa home">
          <span className="flex items-center gap-2 text-3xl font-extrabold leading-none" style={{ color: "var(--brand)" }}>
            Loopa
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/loopa-mark.svg" alt="" width={36} height={32} />
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest muted">Smart study companion</span>
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col items-center px-4 pb-16 pt-10">
        <h1 className="text-center text-4xl font-bold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-center text-sm muted">Join Loopa to track your study sessions, build focus habits, and keep your progress simple.</p>

        <div className="card mt-6 w-full space-y-4 !rounded-3xl shadow-lg">
          {!a.enabled && (
            <p className="rounded-xl p-3 text-sm" style={{ background: "var(--panel)" }}>
              Sign-in isn&apos;t configured on this deployment yet. You can still use Loopa as a guest; your history just won&apos;t be saved to an account.
            </p>
          )}
          <button className="btn w-full !rounded-xl" disabled={!a.enabled || busy} onClick={google}>
            <IconBrandGoogleFilled size={18} aria-hidden />Continue with Google
          </button>
          <div className="flex items-center gap-3 text-xs muted">
            <span className="h-px flex-1" style={{ background: "var(--line)" }} />or<span className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-bold">Email
              <input className="field mt-1" type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!a.enabled} />
            </label>
            {mode === "signup" && (
              <label className="block text-xs font-bold">Username
                <input className="field mt-1" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]{3,24}" placeholder="your_username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!a.enabled} />
              </label>
            )}
            <label className="block text-xs font-bold">Password
              <input className="field mt-1" type="password" required minLength={8} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!a.enabled} />
            </label>
            <button type="submit" className="btn btn-primary w-full !rounded-xl" disabled={!a.enabled || busy}>{mode === "signup" ? "Create account" : "Log in"}</button>
          </form>
          {msg && <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>{msg}</p>}
          <p className="text-center text-xs muted">
            {mode === "signup" ? "Already have an account? " : "New to Loopa? "}
            <button className="font-bold underline" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(null); }}>
              {mode === "signup" ? "Log in" : "Create account"}
            </button>
          </p>
        </div>
        <button className="mt-4 text-sm underline muted" onClick={guest}>Continue without an account</button>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
