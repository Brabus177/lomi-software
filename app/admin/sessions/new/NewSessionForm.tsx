"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { t } from "@/lib/i18n";

const PRESET_COLORS = ["#16a34a", "#2563eb", "#dc2626", "#ea580c", "#9333ea", "#0891b2"];

export function NewSessionForm({ maps }: { maps: { id: string; label: string }[] }) {
  const router = useRouter();
  const [mapId, setMapId] = useState(maps[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [teams, setTeams] = useState<{ name: string; color: string }[]>([
    { name: "1. csapat", color: PRESET_COLORS[0] },
    { name: "2. csapat", color: PRESET_COLORS[1] },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error(t.errors.notSignedIn);

      const sIns = await sb
        .from("sessions")
        .insert({
          owner: user.id,
          map_id: mapId,
          title: title.trim() || null,
        })
        .select("id")
        .single();
      if (sIns.error) throw sIns.error;

      const tIns = await sb
        .from("teams")
        .insert(teams.filter((x) => x.name.trim()).map((x) => ({
          session_id: sIns.data.id,
          name: x.name.trim(),
          color: x.color,
        })))
        .select("id");
      if (tIns.error) throw tIns.error;

      router.push(`/admin/sessions/${sIns.data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const inputCls =
    "w-full px-3 h-10 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition";

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t.newSession.mapLabel}</label>
        <select
          value={mapId}
          onChange={(e) => setMapId(e.target.value)}
          className={inputCls}
        >
          {maps.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t.newSession.titleLabel}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.newSession.titlePlaceholder}
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t.newSession.teams}</label>
        <ul className="space-y-2">
          {teams.map((tm, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={tm.color}
                onChange={(e) => setTeams((p) => p.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
                className="w-10 h-10 rounded-lg border cursor-pointer"
                aria-label="szín"
              />
              <input
                value={tm.name}
                onChange={(e) => setTeams((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className={inputCls + " flex-1"}
                placeholder={t.newSession.teamPlaceholder(i + 1)}
              />
              <button
                type="button"
                className="text-xs text-destructive hover:underline px-1"
                onClick={() => setTeams((p) => p.filter((_, j) => j !== i))}
                aria-label="törlés"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() =>
            setTeams((p) => [
              ...p,
              { name: t.newSession.teamPlaceholder(p.length + 1), color: PRESET_COLORS[p.length % PRESET_COLORS.length] },
            ])
          }
        >
          {t.newSession.addTeam}
        </button>
      </div>

      {err && <div className="text-sm text-destructive">{err}</div>}

      <Button onClick={submit} disabled={busy || !mapId || teams.length === 0} className="w-full h-11 rounded-xl">
        {busy ? t.newSession.creating : t.newSession.create}
      </Button>
    </div>
  );
}
