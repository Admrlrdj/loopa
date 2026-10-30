import Link from "next/link";

export const metadata = { title: "Privacy Policy — Loopa" };

export default function PrivacyPage() {
  return (
    <div className="page-wrap">
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <Link href="/" className="text-sm font-bold underline">← Back to Loopa</Link>
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm muted">Last updated: 30 October 2026. Loopa is a student project (IPB University) and is not a medical product.</p>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">What Loopa processes</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><b>Camera frames.</b> While a study session runs, frames from your webcam are sent to our server only to detect eye closure, yawning and head position. Frames are analysed in memory and are <b>not stored</b>.</li>
            <li><b>Session data.</b> Study and break durations, counts of alerts, yawns and eye-closure events, your reflection, and the generated recommendation.</li>
            <li><b>Account data.</b> If you sign in with Google or email, we receive your email address, display name and profile picture so we can save your history to your account.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">How it is used</h2>
          <p className="text-sm">To show your session summary, history and statistics, and to write study recommendations. Aggregated session numbers (not images or your identity) may be sent to a third-party AI service (OpenRouter) to generate the recommendation text. Results are visual indications only, not a medical diagnosis.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Where data lives</h2>
          <p className="text-sm">Account and session data is stored in Supabase, protected so that each signed-in user can read only their own records. The app is hosted on Vercel and Railway. We do not sell your data or use it for advertising.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Your choices</h2>
          <p className="text-sm">You can use Loopa as a guest without an account, deny camera permission at any time, and ask us to delete your account and history by emailing <a className="underline" href="mailto:radjaadmiral00@gmail.com">radjaadmiral00@gmail.com</a>.</p>
        </section>
      </main>
    </div>
  );
}
