import { useState } from "react";
import { useNav } from "@/components/app/nav";
import { Card, ErrorNote, GhostButton, PrimaryButton, ScreenHeader, ToggleRow } from "@/components/ui";
import { useJarvis } from "@/lib/store";

function quietNow(start: string, end: string) {
  const toMins = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };
  const from = toMins(start);
  const to = toMins(end);
  if (from === null || to === null || from === to) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return from < to ? mins >= from && mins < to : mins >= from || mins < to;
}

export function NotificationsScreen() {
  const { back } = useNav();
  const notify = useJarvis((state) => state.notify);
  const patch = useJarvis((state) => state.patchNotify);
  const setApp = useJarvis((state) => state.setNotifyApp);
  const log = useJarvis((state) => state.logAction);
  const actions = useJarvis((state) => state.actions);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [draft, setDraft] = useState(notify.template);
  const [error, setError] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const quiet = quietNow(notify.quietStart, notify.quietEnd);
  const drafts = actions.filter((item) => item.name === "Reply draft").slice(0, 6);

  return (
    <div className="min-h-full">
      <ScreenHeader title="Notification assistant" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <Card>
          <p className="text-sm text-fg">Permission: {permission}</p>
          <p className="mt-2 text-xs text-muted">
            This browser can show its own notifications. It cannot read WhatsApp, Telegram, or other apps, and it cannot
            send replies into them. Auto-reply here only saves a draft you confirm.
          </p>
          <GhostButton
            className="mt-3"
            onClick={() => {
              if (typeof Notification === "undefined") {
                setError("Notifications are not available in this browser.");
                return;
              }
              void Notification.requestPermission().then((result) => {
                setPermission(result);
                log("Notification permission", result === "granted" ? "success" : "failed", result);
              });
            }}
          >
            Request notification permission
          </GhostButton>
        </Card>
        <Card>
          <ToggleRow label="Study mode" detail="Pauses pop-up alerts from this app." checked={notify.studyMode} onChange={(value) => patch({ studyMode: value })} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Quiet from
              <input type="time" value={notify.quietStart} onChange={(event) => patch({ quietStart: event.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-border bg-bg px-3 text-fg" />
            </label>
            <label className="text-xs text-muted">
              Until
              <input type="time" value={notify.quietEnd} onChange={(event) => patch({ quietEnd: event.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-border bg-bg px-3 text-fg" />
            </label>
          </div>
          {quiet ? <p className="mt-2 text-xs text-primary">Quiet hours are active.</p> : null}
        </Card>
        <Card className="space-y-2">
          <h2 className="text-sm text-fg">Watch list</h2>
          {notify.apps.map((app) => (
            <ToggleRow
              key={app.id}
              label={app.name}
              detail="Listener not available in this browser."
              checked={app.autoReply}
              onChange={(value) => setApp(app.id, value)}
            />
          ))}
        </Card>
        <Card className="space-y-3">
          <h2 className="text-sm text-fg">Reply draft</h2>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-24 w-full rounded-2xl border border-border bg-bg px-3 py-2 text-sm text-fg" />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {confirmSend ? (
            <p className="text-xs text-muted">This will only save the draft in action history. It will not message another app.</p>
          ) : null}
          <PrimaryButton
            disabled={!draft.trim() || notify.studyMode}
            onClick={() => {
              if (!confirmSend) {
                setConfirmSend(true);
                return;
              }
              patch({ template: draft.trim() });
              log("Reply draft", "success", draft.trim().slice(0, 80));
              if (permission === "granted" && !quiet && !notify.studyMode && typeof Notification !== "undefined") {
                new Notification("JARVIS BY KUSHAL", { body: "Reply draft saved on this device." });
              }
              setConfirmSend(false);
              setError("");
            }}
          >
            {notify.studyMode ? "Paused for study mode" : confirmSend ? "Confirm save draft" : "Save draft"}
          </PrimaryButton>
        </Card>
        <Card>
          <h2 className="text-sm text-fg">Recent drafts</h2>
          {drafts.length === 0 ? <p className="mt-2 text-xs text-muted">No drafts yet.</p> : null}
          {drafts.map((item) => (
            <p key={item.id} className="mt-2 text-xs text-muted">
              {new Date(item.at).toLocaleString()} · {item.detail}
            </p>
          ))}
        </Card>
      </div>
    </div>
  );
}
