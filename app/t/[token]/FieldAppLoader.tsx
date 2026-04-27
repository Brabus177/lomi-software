"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const FieldApp = dynamic(() => import("./FieldApp").then((m) => m.FieldApp), {
  ssr: false,
  loading: () => <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>,
});

export function FieldAppLoader(props: ComponentProps<typeof FieldApp>) {
  return <FieldApp {...props} />;
}
