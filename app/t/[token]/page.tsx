import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FieldAppLoader } from "./FieldAppLoader";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb.rpc("team_info_for_token", { p_token: token });
  const info = (data as Array<Record<string, unknown>> | null)?.[0];
  if (error || !info) notFound();

  return (
    <FieldAppLoader
      shareToken={token}
      teamId={info.team_id as string}
      teamName={info.team_name as string}
      teamColor={info.team_color as string}
      mapImageUrl={info.map_image_url as string}
      mapImageW={info.map_image_w as number}
      mapImageH={info.map_image_h as number}
      mapTransform={info.map_georef_transform as import("@/lib/georef").AffineTransform}
    />
  );
}
