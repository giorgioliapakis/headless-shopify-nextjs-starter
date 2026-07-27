"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { THEME_STORAGE_KEY } from "@/config/schema/theme";
import { cn } from "@/lib/utils";

type ThemePreference = "light" | "dark" | "system";

const OPTIONS: { icon: typeof SunIcon; label: string; value: ThemePreference }[] = [
  { icon: SunIcon, label: "Light", value: "light" },
  { icon: MoonIcon, label: "Dark", value: "dark" },
  { icon: MonitorIcon, label: "System", value: "system" },
];

function applyPreference(preference: ThemePreference): void {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = preference === "system" ? (prefersDark ? "dark" : "light") : preference;
  document.documentElement.setAttribute("data-theme", resolved);
  if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
  else localStorage.setItem(THEME_STORAGE_KEY, preference);
}

/**
 * Explicit colour-scheme control.
 *
 * The pre-paint script in the document head has already put the resolved scheme on `<html>`, so this
 * renders a neutral "system" state on the server and reconciles after mount — the visible theme
 * never depends on this component hydrating.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      setPreference(stored === "dark" || stored === "light" ? stored : "system");
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); "system" stays correct.
    }
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      document.documentElement.setAttribute("data-theme", media.matches ? "dark" : "light");
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preference]);

  return (
    <div
      role="radiogroup"
      aria-label="Color scheme"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-card p-1 text-card-foreground",
        className,
      )}
    >
      {OPTIONS.map(({ icon: Icon, label, value }) => {
        const selected = mounted && preference === value;
        return (
          <Button
            key={value}
            aria-checked={selected}
            aria-label={label}
            className={cn("rounded-full", selected && "bg-accent text-accent-foreground")}
            onClick={() => {
              setPreference(value);
              applyPreference(value);
            }}
            role="radio"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Icon aria-hidden />
          </Button>
        );
      })}
    </div>
  );
}
