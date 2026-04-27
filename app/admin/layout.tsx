import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { SignOutButton } from "./SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/admin" className="font-semibold tracking-tight text-base flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/15 text-primary inline-flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <path d="M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13Z" />
                <circle cx="12" cy="9" r="3" />
              </svg>
            </span>
            <span className="hidden sm:inline">{t.appName}</span>
            <span className="sm:hidden">Lomi</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition">
              {t.admin.sessionsTitle}
            </Link>
            <Link href="/admin/maps" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition">
              {t.nav.maps}
            </Link>
            <Link
              href="/admin/sessions/new"
              className="ml-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-xs sm:text-sm font-medium"
            >
              {t.nav.newSession}
            </Link>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-2 flex items-center justify-end gap-3 text-xs text-muted-foreground">
          <span className="truncate max-w-[60vw]">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
