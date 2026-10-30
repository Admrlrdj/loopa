import type { Metadata } from "next";
import "@fontsource-variable/inter";
import { AppShell } from "@/components/ui/AppShell";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loopa — Smart Study Assistant",
  description: "Pomodoro study companion with webcam-based drowsiness indication",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
