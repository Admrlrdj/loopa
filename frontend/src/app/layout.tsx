import type { Metadata } from "next";
import "@fontsource-variable/inter"; // Inter (font Figma), dibundel agar build tidak butuh jaringan
import { Sidebar } from "@/components/ui/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loopa — Smart Study Assistant",
  description: "Pomodoro study companion with webcam-based drowsiness indication",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
