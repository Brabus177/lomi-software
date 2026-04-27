"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { fitAffine, type ControlPoint } from "@/lib/georef";
import { supabaseBrowser } from "@/lib/supabase/browser";

const GeorefEditor = dynamic(
  () => import("@/components/map/GeorefEditor").then((m) => m.GeorefEditor),
  { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Loading editor…</div> },
);

export function GeorefClient({
  id,
  imageUrl,
  imageW,
  imageH,
  initialPoints,
}: {
  id: string;
  imageUrl: string;
  imageW: number;
  imageH: number;
  initialPoints: ControlPoint[] | null;
}) {
  const router = useRouter();
  return (
    <GeorefEditor
      imageUrl={imageUrl}
      imageW={imageW}
      imageH={imageH}
      initialPoints={initialPoints ?? undefined}
      onSave={async (points) => {
        const transform = fitAffine(points);
        const sb = supabaseBrowser();
        const { error } = await sb
          .from("maps")
          .update({
            georef_points: points,
            georef_transform: transform,
          })
          .eq("id", id);
        if (error) {
          alert(error.message);
          return;
        }
        router.push("/admin/maps");
      }}
    />
  );
}
