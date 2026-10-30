"use client";
import { IconChartBar, IconHistory, IconHome, IconLogin, IconLogout, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const ITEMS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/history", label: "History", Icon: IconHistory },
  { href: "/statistics", label: "Statistics", Icon: IconChartBar },
];

export function Avatar({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="flex items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: "var(--btn)", fontSize: size * 0.42 }}>
      {(name[0] ?? "L").toUpperCase()}
    </span>
  );
}

export function Sidebar() {
  const path = usePathname();
  const a = useAuth();
  return (
    <aside className="relative flex shrink-0 flex-col gap-6 overflow-hidden border-b bg-white p-4 md:w-64 md:border-b-0 md:border-r md:p-6" style={{ borderColor: "var(--line)" }}>
      <Link href="/" className="flex flex-col" aria-label="Loopa home">
        <span className="flex items-center gap-2 text-3xl font-extrabold leading-none" style={{ color: "var(--brand)" }}>
          Loopa
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/loopa-mark.svg" alt="" width={36} height={32} />
        </span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest muted">Smart study companion</span>
      </Link>
      <nav className="flex gap-2 md:flex-col">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="nav-link" aria-current={path === href ? "page" : undefined}>
            <Icon size={20} stroke={1.8} aria-hidden />{label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/plant.svg" alt="" className="pointer-events-none hidden w-20 md:block" />
        {a.enabled && !a.loading && (a.user ? (
          <div className="flex items-center gap-3 rounded-2xl p-2" style={{ background: "var(--panel)" }}>
            <Avatar url={a.avatarUrl} name={a.displayName} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold">{a.displayName}</p>
              <p className="truncate text-[11px] muted">{a.user.email}</p>
            </div>
            <Link href="/profile" aria-label="Edit profile" className="rounded-lg p-1.5 hover:bg-white"><IconSettings size={18} /></Link>
            <button aria-label="Sign out" onClick={() => void a.signOut()} className="rounded-lg p-1.5 hover:bg-white"><IconLogout size={18} /></button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary w-full"><IconLogin size={18} aria-hidden />{a.guest ? "Sign in to save history" : "Sign in"}</Link>
        ))}
        <p className="hidden text-[11px] muted md:block">Detection results are visual indications only, not a medical diagnosis.</p>
      </div>
    </aside>
  );
}
