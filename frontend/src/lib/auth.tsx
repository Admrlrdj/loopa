"use client";
import type { Session, User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authEnabled, supabase } from "@/lib/supabase";

export interface Profile { username: string | null; avatar_url: string | null }

interface AuthCtx {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  guest: boolean;
  displayName: string;
  avatarUrl: string | null;
  signInWithGoogle: () => Promise<string | null>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (p: Partial<Profile>) => Promise<string | null>;
  continueAsGuest: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const GUEST_KEY = "loopa_guest";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(authEnabled);
  const [guest, setGuest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try { setGuest(localStorage.getItem(GUEST_KEY) === "1"); } catch { /* storage diblokir */ }
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  const loadProfile = useCallback(async (u: User | null) => {
    if (!supabase || !u) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("username, avatar_url").eq("id", u.id).maybeSingle();
    const meta = u.user_metadata ?? {};
    setProfile({
      username: data?.username ?? (meta.username as string | undefined) ?? u.email?.split("@")[0] ?? null,
      avatar_url: data?.avatar_url ?? (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null,
    });
  }, []);
  useEffect(() => { void loadProfile(user); }, [user, loadProfile]);

  const value = useMemo<AuthCtx>(() => ({
    enabled: authEnabled, loading, user, profile, guest,
    displayName: profile?.username || user?.email?.split("@")[0] || (guest ? "Guest" : "Looper"),
    avatarUrl: profile?.avatar_url ?? null,
    async signInWithGoogle() {
      if (!supabase) return "Login is not configured.";
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/` } });
      return error?.message ?? null;
    },
    async signInWithEmail(email, password) {
      if (!supabase) return "Login is not configured.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    },
    async signUpWithEmail(email, password, username) {
      if (!supabase) return "Login is not configured.";
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
      if (error) return error.message;
      return data.session ? null : "Check your email to confirm your account, then log in.";
    },
    async signOut() {
      await supabase?.auth.signOut();
      try { localStorage.removeItem(GUEST_KEY); } catch { /* */ }
      setGuest(false);
      router.push("/login");
    },
    async updateProfile(p) {
      if (!supabase || !user) return "Not signed in.";
      const { error } = await supabase.from("profiles").update({ ...p, updated_at: new Date().toISOString() }).eq("id", user.id);
      if (error) return error.code === "23505" ? "That username is taken." : error.code === "23514" ? "Username: 3–24 letters, numbers, _ or . only." : error.message;
      setProfile((cur) => ({ username: cur?.username ?? null, avatar_url: cur?.avatar_url ?? null, ...p }));
      return null;
    },
    continueAsGuest() {
      try { localStorage.setItem(GUEST_KEY, "1"); } catch { /* */ }
      setGuest(true);
    },
  }), [loading, user, profile, guest, router]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

/** Arahkan ke /login bila login aktif tetapi pengguna belum masuk dan belum memilih mode tamu. */
export function useRequireAuth() {
  const a = useAuth();
  const router = useRouter();
  const path = usePathname();
  const blocked = a.enabled && !a.loading && !a.user && !a.guest;
  useEffect(() => { if (blocked) router.replace(`/login?next=${encodeURIComponent(path)}`); }, [blocked, router, path]);
  return { ...a, ready: !a.loading && !blocked };
}
