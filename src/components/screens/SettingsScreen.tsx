import { ChevronRight } from "lucide-react";
import { useNav } from "@/components/app/nav";
import { ScreenHeader } from "@/components/ui";
import type { ScreenId } from "@/lib/types";

const ROWS: { screen: ScreenId; title: string; detail: string; setup?: boolean }[] = [
  { screen: "orb-settings", title: "Orb and animation", detail: "Size, glow, particles, battery mode" },
  { screen: "appearance", title: "Appearance", detail: "Text size and motion" },
  { screen: "voice-settings", title: "Voice settings", detail: "Gemini voices and device fallback" },
  { screen: "ai-config", title: "AI configuration", detail: "Model, length, connection test" },
  { screen: "weather", title: "Weather", detail: "City, forecast, refresh" },
  { screen: "personalization", title: "Personalization", detail: "Your name" },
  { screen: "memory", title: "Memory", detail: "Saved facts" },
  { screen: "device", title: "Device control", detail: "What this browser can and cannot do" },
  { screen: "notifications", title: "Notifications and automation", detail: "Drafts, quiet hours, study mode" },
  { screen: "privacy", title: "Privacy and security", detail: "Lock, export, delete" },
  { screen: "system", title: "System and performance", detail: "Live service status" },
  { screen: "setup", title: "API management", detail: "Update Gemini and weather", setup: true },
  { screen: "offline", title: "Offline mode", detail: "Local tools only" },
  { screen: "history", title: "Action history", detail: "Successes and failures" },
];

export function SettingsScreen() {
  const { go, openSetup } = useNav();
  return (
    <div className="min-h-full">
      <ScreenHeader title="Settings" />
      <div className="space-y-2 px-4 pb-6">
        {ROWS.map((row) => (
          <button
            key={row.title}
            type="button"
            onClick={() => (row.setup ? openSetup("manage") : go(row.screen))}
            className="flex w-full items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-fg">{row.title}</span>
              <span className="block text-xs text-muted">{row.detail}</span>
            </span>
            <ChevronRight className="size-4 text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}
