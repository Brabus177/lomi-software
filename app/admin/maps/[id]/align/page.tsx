import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AlignClient } from "./AlignClient";
import { t } from "@/lib/i18n";

export default async function AlignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: map } = await supabase
    .from("maps")
    .select("id, label, image_url, image_w, image_h, georef_transform")
    .eq("id", id)
    .maybeSingle();

  if (!map) notFound();

  if (!map.georef_transform) {
    return (
      <div className="space-y-4 max-w-xl">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.align.title}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{map.label}</h1>
        </div>
        <div className="rounded-2xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          {t.align.needGeoref}{" "}
          <Link href={`/admin/maps/${map.id}/georef`} className="text-primary hover:underline">
            {t.maps.georefAction}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.align.title}</div>
        <h1 className="text-2xl font-semibold tracking-tight">{map.label}</h1>
      </div>
      <AlignClient
        id={map.id}
        imageUrl={map.image_url}
        imageW={map.image_w}
        imageH={map.image_h}
        initialTransform={map.georef_transform as import("@/lib/georef").AffineTransform}
      />
    </div>
  );
}
