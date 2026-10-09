import { useState } from "react";
import { useNav } from "@/components/app/nav";
import { GhostButton, ScreenHeader } from "@/components/ui";
import { LAUNCH_APPS } from "@/lib/launcher";
import { useJarvis } from "@/lib/store";

export function AppsScreen() {
  const { back, go } = useNav();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<(typeof LAUNCH_APPS)[number] | null>(null);
  const log = useJarvis((state) => state.logAction);
  const items = LAUNCH_APPS.filter((app) => `${app.name} ${app.packageName}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-full">
      <ScreenHeader title="Open apps" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps…" className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-fg outline-none" />
        <p className="text-xs text-muted">This list is not your phone's installed apps. Browser links open in a new tab. Native-only actions are labeled.</p>
        {items.map((app) => (
          <button
            key={app.name}
            type="button"
            onClick={() => setPending(app)}
            className="flex w-full items-center justify-between rounded-3xl border border-border bg-surface px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm text-fg">{app.name}</span>
              <span className="block text-xs text-muted">{app.packageName}</span>
            </span>
            <span className="text-xs text-primary">{app.mode === "native" ? "Needs Android" : "Open"}</span>
          </button>
        ))}
        {pending ? (
          <div className="rounded-3xl border border-primary bg-surface-2 p-4">
            <p className="text-sm text-fg">{pending.name}</p>
            <p className="mt-1 text-xs text-muted">{pending.blurb}</p>
            <div className="mt-3 flex gap-2">
              <GhostButton
                onClick={() => {
                  if (pending.mode === "native" || !pending.href) {
                    log(`Open ${pending.name}`, "failed", pending.mode === "camera" ? "Use screen analysis" : "Native Android required");
                    if (pending.mode === "camera") go("analysis");
                    setPending(null);
                    return;
                  }
                  window.open(pending.href, "_blank", "noopener,noreferrer");
                  log(`Open ${pending.name}`, "success", "Opened in the browser");
                  setPending(null);
                }}
              >
                {pending.mode === "camera" ? "Use camera tool" : pending.mode === "native" ? "Log as unavailable" : "Open"}
              </GhostButton>
              <GhostButton onClick={() => setPending(null)}>Cancel</GhostButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
