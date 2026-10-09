import type { LucideIcon } from "lucide-react";
import { AppWindow, Bell, Brain, Camera, CloudSun, Code2, Globe, NotebookPen, Timer } from "lucide-react";
import { useNav } from "@/components/app/nav";
import { Card, ScreenHeader, ToggleRow } from "@/components/ui";
import { useJarvis } from "@/lib/store";
import type { ScreenId } from "@/lib/types";

const TILES: { screen: ScreenId; title: string; detail: string; icon: LucideIcon }[] = [
  { screen: "apps", title: "Open apps", detail: "Browser links, not Android packages", icon: AppWindow },
  { screen: "chat", title: "Web search", detail: "Turns on Gemini search grounding", icon: Globe },
  { screen: "notes", title: "Notes", detail: "Saved on this device", icon: NotebookPen },
  { screen: "reminders", title: "Reminders", detail: "While this app is open", icon: Timer },
  { screen: "analysis", title: "Screen analysis", detail: "Photo or shared screen", icon: Camera },
  { screen: "weather", title: "Weather", detail: "Live forecast", icon: CloudSun },
  { screen: "notifications", title: "Notifications", detail: "Drafts only in the browser", icon: Bell },
  { screen: "memory", title: "Memory", detail: "Facts you choose to keep", icon: Brain },
];

export function ToolsScreen() {
  const { go } = useNav();
  const study = useJarvis((state) => state.notify.studyMode);
  const patch = useJarvis((state) => state.patchNotify);
  const patchAi = useJarvis((state) => state.patchAi);

  return (
    <div className="min-h-full">
      <ScreenHeader title="Tools and actions" />
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.title}
              type="button"
              onClick={() => {
                if (tile.screen === "chat" && tile.title === "Web search") patchAi({ grounding: true });
                go(tile.screen);
              }}
              className="rounded-3xl border border-border bg-surface p-4 text-left"
            >
              <Icon className="size-5 text-primary" />
              <p className="mt-3 text-sm text-fg">{tile.title}</p>
              <p className="mt-1 text-xs text-muted">{tile.detail}</p>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-6">
        <Card>
          <ToggleRow
            label="Study mode"
            detail="Keeps replies focused and holds notification drafts."
            checked={study}
            onChange={(value) => patch({ studyMode: value })}
          />
          <button type="button" onClick={() => go("chat")} className="mt-2 inline-flex items-center gap-2 text-sm text-primary">
            <Code2 className="size-4" /> Code assistant in chat
          </button>
        </Card>
      </div>
    </div>
  );
}
