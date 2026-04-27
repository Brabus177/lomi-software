"use client";

import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}

/**
 * Browser client scoped to a field-team `share_token`. Every request carries
 * `x-team-token`, which RLS policies use to authorize anonymous writes to the
 * team's own positions/bags rows.
 */
export function supabaseTeamClient(shareToken: string) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { "x-team-token": shareToken } },
    },
  );
}
