import Link from "next/link";
import { t } from "@/lib/i18n";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-accent/40">
      <div className="max-w-md w-full">
        <div className="rounded-3xl border bg-card shadow-sm p-8 space-y-6 text-center">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mx-auto">
            <svg viewBox="0 0 24 24" fill="none" className="size-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13Z" />
              <circle cx="12" cy="9" r="3" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t.home.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.home.description}</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex w-full items-center justify-center h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            {t.home.adminCta}
          </Link>
          <p className="text-xs text-muted-foreground">{t.home.teamHint}</p>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">{t.tagline}</p>
      </div>
    </div>
  );
}
