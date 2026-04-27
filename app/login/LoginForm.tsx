"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { t } from "@/lib/i18n";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const sb = supabaseBrowser();

    if (mode === "password") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setErr(error.message);
      else router.push("/admin");
      return;
    }

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  if (sent) {
    return <p className="text-sm rounded-xl bg-accent/60 border border-accent text-accent-foreground p-3">{t.login.sent}</p>;
  }

  const inputCls =
    "w-full px-3 h-11 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition";

  return (
    <div className="space-y-3">
      <input
        type="email"
        autoComplete="email"
        placeholder={t.login.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputCls}
      />
      {mode === "password" && (
        <input
          type="password"
          autoComplete="current-password"
          placeholder={t.login.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && email && password && !busy) submit();
          }}
          className={inputCls}
        />
      )}
      {err && <div className="text-sm text-destructive">{err}</div>}
      <Button
        disabled={!email || (mode === "password" && !password) || busy}
        onClick={submit}
        className="w-full h-11 text-sm rounded-xl"
      >
        {busy ? t.login.submitting : mode === "password" ? t.login.submitPassword : t.login.submitMagic}
      </Button>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground hover:underline mx-auto block"
        onClick={() => {
          setMode((m) => (m === "password" ? "magic" : "password"));
          setErr(null);
        }}
      >
        {mode === "password" ? t.login.switchToMagic : t.login.switchToPassword}
      </button>
    </div>
  );
}
