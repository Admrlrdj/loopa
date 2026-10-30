"use client";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Sidebar";
import { useRequireAuth } from "@/lib/auth";

export default function ProfilePage() {
  const a = useRequireAuth();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setUsername(a.profile?.username ?? ""); setAvatar(a.profile?.avatar_url ?? ""); }, [a.profile]);
  if (!a.ready) return null;
  if (!a.user) return <p className="muted">Sign in to edit your profile.</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const err = await a.updateProfile({ username: username.trim(), avatar_url: avatar.trim() || null });
    setMsg(err ? { ok: false, text: err } : { ok: true, text: "Profile saved." });
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Your profile</h1>
      <form onSubmit={save} className="card max-w-lg space-y-4 !rounded-3xl">
        <div className="flex items-center gap-4">
          <Avatar url={avatar.trim() || null} name={username || a.displayName} size={64} />
          <div className="text-sm">
            <p className="font-bold">{a.user.email}</p>
            <p className="muted">Signed in with {a.user.app_metadata?.provider ?? "email"}</p>
          </div>
        </div>
        <label className="block text-xs font-bold">Username
          <input className="field mt-1" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]{3,24}" value={username} onChange={(e) => setUsername(e.target.value)} />
          <span className="mt-1 block font-normal muted">3–24 letters, numbers, _ or .</span>
        </label>
        <label className="block text-xs font-bold">Avatar URL
          <input className="field mt-1" type="url" placeholder="https://…" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
          <span className="mt-1 block font-normal muted">Paste an image link, or leave empty for your initial. Google sign-in fills this automatically.</span>
        </label>
        {msg && <p role="status" className="text-sm" style={{ color: msg.ok ? "#2e7d4f" : "var(--danger)" }}>{msg.text}</p>}
        <button className="btn btn-primary" disabled={busy}><IconDeviceFloppy size={18} aria-hidden />Save changes</button>
      </form>
    </div>
  );
}
