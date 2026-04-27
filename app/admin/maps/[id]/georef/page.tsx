import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { GeorefClient } from "./GeorefClient";
import { t } from "@/lib/i18n";

export default async function GeorefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: map } = await supabase
    .from("maps")
    .select("id, label, image_url, image_w, image_h, georef_points")
    .eq("id", id)
    .maybeSingle();

  if (!map) notFound();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.georef.title}</div>
        <h1 className="text-2xl font-semibold tracking-tight">{map.label}</h1>
      </div>
      <GeorefClient
        id={map.id}
        imageUrl={map.image_url}
        imageW={map.image_w}
        imageH={map.image_h}
        initialPoints={(map.georef_points as never) ?? null}
      />
    </div>
  );
}
