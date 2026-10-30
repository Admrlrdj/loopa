"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui/Sidebar";

const WITH_SIDEBAR = new Set(["/", "/history", "/statistics", "/profile"]);

/** Home/History/Statistics/Profile memakai sidebar; Setup, Session, Break, Wrap, Login layar penuh seperti di Figma. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (!WITH_SIDEBAR.has(path)) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
