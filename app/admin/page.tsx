import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export default async function AdminHome() {
  const supabase = await supabaseServer();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date, title, ended_at, map:map_id(label), teams:teams(id)")
    .order("date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.admin.sessionsTitle}</h1>
        <Link
          href="/admin/sessions/new"
          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          {t.admin.newSession}
        </Link>
      </div>

      {(!sessions || sessions.length === 0) && (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          {t.admin.emptySessionsBefore}{" "}
          <Link href="/admin/maps" className="text-primary hover:underline">
            {t.admin.emptySessionsLink}
          </Link>
          {t.admin.emptySessionsAfter}
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sessions.map((s) => {
            const map = s.map as unknown as { label: string } | null;
            const teams = (s.teams as unknown as { id: string }[] | null) ?? [];
            const live = !s.ended_at;
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/sessions/${s.id}`}
                  className="block rounded-2xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {s.title ?? map?.label ?? t.admin.sessionsTitle}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.date} · {teams.length} {teams.length === 1 ? t.admin.teamSingular : t.admin.teamPlural}
                      </div>
                    </div>
                    <span
                      className={
                        "shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium " +
                        (live
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      <span
                        className={
                          "size-1.5 rounded-full " +
                          (live ? "bg-primary animate-pulse" : "bg-muted-foreground")
                        }
                      />
                      {live ? t.admin.sessionLive : t.admin.sessionEnded}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
