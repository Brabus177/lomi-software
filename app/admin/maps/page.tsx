import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { MapUploader } from "./MapUploader";
import { t } from "@/lib/i18n";

export default async function AdminMaps() {
  const supabase = await supabaseServer();
  const { data: maps } = await supabase
    .from("maps")
    .select("id, label, image_url, image_w, image_h, georef_transform, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.maps.title}</h1>
        <p className="text-sm text-muted-foreground max-w-prose">{t.maps.description}</p>
      </div>

      <MapUploader />

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t.maps.yours}</h2>
        {(!maps || maps.length === 0) && (
          <div className="text-sm text-muted-foreground rounded-2xl border border-dashed p-6 bg-card text-center">
            {t.maps.none}
          </div>
        )}
        {maps && maps.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {maps.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/maps/${m.id}/georef`}
                  className="flex gap-3 rounded-2xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image_url}
                    alt={m.label}
                    className="w-24 h-24 object-cover rounded-xl border bg-muted"
                  />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="font-medium truncate">{m.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.image_w}×{m.image_h}
                    </div>
                    <div className="mt-auto">
                      <span
                        className={
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium " +
                          (m.georef_transform
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-100 text-amber-700")
                        }
                      >
                        <span
                          className={
                            "size-1.5 rounded-full " +
                            (m.georef_transform ? "bg-primary" : "bg-amber-500")
                          }
                        />
                        {m.georef_transform ? t.maps.georeferenced : t.maps.needsGeoref}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
