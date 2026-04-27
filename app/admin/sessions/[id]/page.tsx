import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LiveSession } from "./LiveSession";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, date, title, map:map_id(id, label, image_url, image_w, image_h, georef_transform)")
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, color, share_token")
    .eq("session_id", id)
    .order("created_at");

  return (
    <LiveSession
      sessionId={session.id}
      title={session.title ?? ""}
      date={session.date}
      map={session.map as unknown as {
        id: string;
        label: string;
        image_url: string;
        image_w: number;
        image_h: number;
        georef_transform: import("@/lib/georef").AffineTransform;
      }}
      teams={teams ?? []}
    />
  );
}
