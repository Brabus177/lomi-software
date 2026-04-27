import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { NewSessionForm } from "./NewSessionForm";
import { t } from "@/lib/i18n";

export default async function NewSession() {
  const supabase = await supabaseServer();
  const { data: maps } = await supabase
    .from("maps")
    .select("id, label, georef_transform")
    .order("created_at", { ascending: false });

  const ready = (maps ?? []).filter((m) => m.georef_transform);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">{t.newSession.title}</h1>
      {ready.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          {t.newSession.needMap}{" "}
          <Link className="text-primary hover:underline" href="/admin/maps">
            {t.newSession.mapsLink}
          </Link>
          .
        </div>
      ) : (
        <NewSessionForm maps={ready.map(({ id, label }) => ({ id, label }))} />
      )}
    </div>
  );
}
