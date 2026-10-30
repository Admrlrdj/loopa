"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChartBar, IconHistory, IconHome } from "@tabler/icons-react";

const ITEMS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/history", label: "History", Icon: IconHistory },
  { href: "/statistics", label: "Statistics", Icon: IconChartBar },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="relative flex shrink-0 flex-col gap-6 overflow-hidden border-b p-4 md:w-60 md:border-b-0 md:border-r md:p-6" style={{ borderColor: "var(--line)" }}>
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
      <p className="hidden text-xs muted md:block">Detection results are visual indications only, not a medical diagnosis.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/plant.svg" alt="" className="pointer-events-none mt-auto hidden w-24 md:block" />
    </aside>
  );
}
