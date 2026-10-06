"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";

const homeColors = {
  "--normal-bg": "hsl(var(--card))",
  "--normal-border": "hsl(var(--border))",
  "--normal-text": "hsl(var(--foreground))",
} as CSSProperties;

export function RouteToaster() {
  const homepage = usePathname() === "/";
  const { resolvedTheme } = useTheme();
  return <Toaster richColors position="top-right"
    theme={homepage || resolvedTheme === "dark" ? "dark" : "light"}
    className={homepage ? "dark" : undefined}
    style={homepage ? homeColors : undefined}
  />;
}
