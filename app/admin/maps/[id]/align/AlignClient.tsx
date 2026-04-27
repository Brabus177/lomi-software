"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { fitAffine, type AffineTransform, type ControlPoint } from "@/lib/georef";
import { supabaseBrowser } from "@/lib/supabase/browser";

const AlignEditor = dynamic(
  () => import("@/components/map/AlignEditor").then((m) => m.AlignEditor),
  { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Loading…</div> },
);

export function AlignClient({
  id,
  imageUrl,
  imageW,
  imageH,
  initialTransform,
}: {
  id: string;
  imageUrl: string;
  imageW: number;
  imageH: number;
  initialTransform: AffineTransform;
}) {
  const router = useRouter();
  return (
    <AlignEditor
      imageUrl={imageUrl}
      imageW={imageW}
      imageH={imageH}
      initialTransform={initialTransform}
      onSave={async (points: ControlPoint[]) => {
        const transform = fitAffine(points);
        const sb = supabaseBrowser();
        const { error } = await sb
          .from("maps")
          .update({ georef_points: points, georef_transform: transform })
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
