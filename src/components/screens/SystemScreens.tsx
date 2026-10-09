import { useEffect, useState } from "react";
import { useNav } from "@/components/app/nav";
import { Card, ErrorNote, GhostButton, PrimaryButton, ScreenHeader, ToggleRow } from "@/components/ui";
import { ANDROID_CAPABILITIES } from "@/lib/android-capabilities";
import { fetchStatus, postCredentials } from "@/lib/client-api";
import { deviceTtsAvailable, speechRecognitionAvailable } from "@/lib/speech-client";
import { hashPin, useJarvis } from "@/lib/store";
import { APP_VERSION } from "@/lib/version";
import type { CredentialStatus } from "@/lib/types";

export function SystemScreen() {
  const { back } = useNav();
  const ai = useJarvis((state) => state.ai);
  const voice = useJarvis((state) => state.voice);
  const task = useJarvis((state) => state.activeTask);
  const actions = useJarvis((state) => state.actions);
  const messages = useJarvis((state) => state.messages);
  const memories = useJarvis((state) => state.memories);
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [geminiLive, setGeminiLive] = useState<"unknown" | "online" | "offline">("unknown");
  const [weatherLive, setWeatherLive] = useState<"unknown" | "online" | "offline">("unknown");
  const [db, setDb] = useState("Checking");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    try {
      localStorage.setItem("jarvis-ping", "1");
      localStorage.removeItem("jarvis-ping");
      setDb("Ready");
    } catch {
      setDb("Unavailable");
    }
    void fetchStatus()
      .then(setStatus)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Status check failed."));
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  const test = (service: "gemini" | "weather") => {
    setError("");
    void postCredentials({ action: "test", service }).then((result) => {
      if (service === "gemini") setGeminiLive(result.ok ? "online" : "offline");
      else setWeatherLive(result.ok ? "online" : "offline");
      if (!result.ok) setError(result.error || "Test failed.");
    });
  };

  const rows = [
    ["Gemini", geminiLive === "online" ? "Online" : status?.gemini.configured ? "Saved, not rechecked" : "Not configured"],
    ["Weather", weatherLive === "online" ? "Online" : status?.weather.configured ? "Saved, not rechecked" : "Not configured"],
    ["Voice input", speechRecognitionAvailable() ? "Browser speech recognition" : "Unavailable"],
    ["Voice output", deviceTtsAvailable() ? "Gemini TTS or device voice" : "Gemini TTS only"],
    ["On-device storage", db],
    ["Internet", online ? "Online" : "Offline"],
    ["Active task", task || "Idle"],
    ["Selected voice", voice.name],
    ["AI model", ai.model],
    ["Saved chat messages", String(messages.length)],
    ["Saved memories", String(memories.length)],
    ["App version", APP_VERSION],
  ];

  return (
    <div className="min-h-full">
      <ScreenHeader title="System dashboard" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <Card className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">{label}</span>
              <span className="text-right text-fg">{value}</span>
            </div>
          ))}
        </Card>
        <p className="text-xs text-muted">Online means a live request succeeded during this visit. A saved key alone is not shown as online.</p>
        <div className="flex gap-2">
          <PrimaryButton onClick={() => test("gemini")}>Test Gemini</PrimaryButton>
          <GhostButton onClick={() => test("weather")}>Test weather</GhostButton>
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Card>
          <h2 className="text-sm text-fg">Recent errors</h2>
          {actions.filter((item) => item.status === "failed").slice(0, 5).map((item) => (
            <p key={item.id} className="mt-2 text-xs text-muted">
              {item.name}: {item.detail || "Failed"}
            </p>
          ))}
          {actions.every((item) => item.status !== "failed") ? <p className="mt-2 text-xs text-muted">No errors yet.</p> : null}
        </Card>
        <Card>
          <h2 className="text-sm text-fg">Android package</h2>
          <p className="mt-2 text-xs text-muted">
            This is the web app. Packaging an APK needs Android Studio and Capacitor on a computer with the Android SDK.
            Device Control lists which actions still need that native layer. You can add this site to your home screen from
            the browser install prompt.
          </p>
        </Card>
      </div>
    </div>
  );
}

export function OfflineScreen() {
  const { back } = useNav();
  const preferred = useJarvis((state) => state.offlinePreferred);
  const setPreferred = useJarvis((state) => state.setOfflinePreferred);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  return (
    <div className="min-h-full">
      <ScreenHeader title="Offline mode" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <Card>
          <p className="text-sm text-fg">Network: {online ? "Online" : "Offline"}</p>
          <ToggleRow label="Prefer offline tools" detail="Blocks Gemini, weather, and voice replies until you turn this off." checked={preferred} onChange={setPreferred} />
        </Card>
        <Card>
          <h2 className="text-sm text-fg">Still available</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
            <li>Notes</li>
            <li>Reminders while the app stays open</li>
            <li>Memories</li>
            <li>Action history</li>
            <li>Orb and voice preferences</li>
          </ul>
          <p className="mt-3 text-xs text-muted">Chat, live weather, and Gemini voices need the network and a validated key.</p>
        </Card>
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const { back } = useNav();
  const actions = useJarvis((state) => state.actions);
  const clear = useJarvis((state) => state.clearActions);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const visible = actions.filter((item) => filter === "all" || item.status === filter);
  return (
    <div className="min-h-full">
      <ScreenHeader title="Action history" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <div className="flex gap-2">
          {(["all", "success", "failed"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? "h-10 rounded-full bg-primary px-3 text-sm text-bg" : "h-10 rounded-full border border-border px-3 text-sm"}>
              {item}
            </button>
          ))}
        </div>
        {visible.map((item) => (
          <div key={item.id} className="rounded-3xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-fg">{item.name}</p>
              <p className={item.status === "success" ? "text-xs text-accent" : "text-xs text-danger"}>{item.status}</p>
            </div>
            <p className="text-xs text-muted">{new Date(item.at).toLocaleString()}</p>
            {item.detail ? <p className="mt-1 text-xs text-muted">{item.detail}</p> : null}
          </div>
        ))}
        {visible.length === 0 ? <p className="text-sm text-muted">No actions in this filter.</p> : null}
        <GhostButton onClick={clear}>Clear history</GhostButton>
      </div>
    </div>
  );
}

export function DeviceScreen() {
  const { back, go } = useNav();
  const log = useJarvis((state) => state.logAction);
  return (
    <div className="min-h-full">
      <ScreenHeader title="Device control" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        {ANDROID_CAPABILITIES.map((item) => (
          <Card key={item.id}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm text-fg">{item.title}</h2>
              <span className="text-xs text-primary">{item.state === "works" ? "Works here" : item.state === "partial" ? "Partial" : "Needs Android"}</span>
            </div>
            <p className="mt-2 text-xs text-muted">{item.detail}</p>
            {item.state === "native" ? (
              <GhostButton
                className="mt-3"
                onClick={() => log(item.title, "failed", "Not available in the browser")}
              >
                Try anyway
              </GhostButton>
            ) : null}
            {item.id === "notes" ? <GhostButton className="mt-3" onClick={() => go("notes")}>Open notes</GhostButton> : null}
            {item.id === "reminders" ? <GhostButton className="mt-3" onClick={() => go("reminders")}>Open reminders</GhostButton> : null}
            {item.id === "apps" ? <GhostButton className="mt-3" onClick={() => go("apps")}>Open launcher</GhostButton> : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function PrivacyScreen() {
  const { back } = useNav();
  const pinHash = useJarvis((state) => state.pinHash);
  const pinSalt = useJarvis((state) => state.pinSalt);
  const webauthnId = useJarvis((state) => state.webauthnId);
  const setPin = useJarvis((state) => state.setPin);
  const setWebauthn = useJarvis((state) => state.setWebauthnId);
  const clearMessages = useJarvis((state) => state.clearMessages);
  const clearPersonal = useJarvis((state) => state.clearPersonal);
  const log = useJarvis((state) => state.logAction);
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState("");
  const [bioNote, setBioNote] = useState("");

  const exportData = () => {
    const state = useJarvis.getState();
    const payload = {
      displayName: state.displayName,
      messages: state.messages,
      memories: state.memories,
      notes: state.notes,
      reminders: state.reminders,
      actions: state.actions,
      preferences: { orb: state.orb, voice: state.voice, ai: state.ai, notify: state.notify },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jarvis-by-kushal-export.json";
    link.click();
    URL.revokeObjectURL(url);
    log("Export data", "success");
  };

  return (
    <div className="min-h-full">
      <ScreenHeader title="Privacy and security" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <Card className="space-y-3">
          <h2 className="text-sm text-fg">App lock</h2>
          <p className="text-xs text-muted">A PIN is checked on this device only. It does not encrypt stored notes. It is not a server account.</p>
          <input value={pin} onChange={(event) => setPinValue(event.target.value)} inputMode="numeric" placeholder="4 digit PIN" className="h-12 w-full rounded-2xl border border-border bg-bg px-4 text-fg" />
          <div className="flex gap-2">
            <PrimaryButton
              disabled={pin.trim().length < 4}
              onClick={() => {
                const salt = crypto.randomUUID();
                void hashPin(pin.trim(), salt).then((hash) => {
                  setPin(hash, salt);
                  setPinValue("");
                  log("Set PIN", "success");
                });
              }}
            >
              {pinHash ? "Replace PIN" : "Save PIN"}
            </PrimaryButton>
            <GhostButton
              onClick={() => {
                setPin(null, null);
                log("Remove PIN", "success");
              }}
            >
              Remove PIN
            </GhostButton>
          </div>
          {pinSalt ? null : null}
        </Card>
        <Card className="space-y-3">
          <h2 className="text-sm text-fg">Device unlock</h2>
          <p className="text-xs text-muted">Uses this browser's platform authenticator when it exists. The preview may block it. Failure is reported, not faked.</p>
          <PrimaryButton
            onClick={() => {
              const credentials = navigator.credentials;
              if (!credentials || !window.PublicKeyCredential) {
                setBioNote("This browser has no platform authenticator API.");
                return;
              }
              void navigator.credentials
                .create({
                  publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    rp: { name: "JARVIS BY KUSHAL" },
                    user: {
                      id: crypto.getRandomValues(new Uint8Array(16)),
                      name: "jarvis",
                      displayName: "JARVIS user",
                    },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                    timeout: 60000,
                  },
                })
                .then((cred) => {
                  if (!cred || cred.type !== "public-key") {
                    setBioNote("No credential was created.");
                    return;
                  }
                  const raw = (cred as PublicKeyCredential).rawId;
                  let binary = "";
                  new Uint8Array(raw).forEach((value) => {
                    binary += String.fromCharCode(value);
                  });
                  setWebauthn(btoa(binary));
                  setBioNote("Device unlock is ready on this browser.");
                  log("Device unlock", "success");
                })
                .catch((err: unknown) => {
                  const message = err instanceof Error ? err.message : "Device unlock was cancelled.";
                  setBioNote(message);
                  log("Device unlock", "failed", message.slice(0, 120));
                });
            }}
          >
            {webauthnId ? "Replace device unlock" : "Enable device unlock"}
          </PrimaryButton>
          {webauthnId ? (
            <GhostButton
              onClick={() => {
                setWebauthn(null);
                setBioNote("Device unlock removed.");
              }}
            >
              Remove device unlock
            </GhostButton>
          ) : null}
          {bioNote ? <p className="text-xs text-muted">{bioNote}</p> : null}
        </Card>
        <Card className="space-y-2">
          <h2 className="text-sm text-fg">Your data</h2>
          <p className="text-xs text-muted">Chat, notes, and memories stay in this browser. API keys stay in the sealed cookie, not in the export.</p>
          <GhostButton onClick={clearMessages}>Clear chat history</GhostButton>
          <GhostButton onClick={exportData}>Export personal data</GhostButton>
          <GhostButton
            onClick={() => {
              if (!window.confirm("Delete notes, chat, memories, reminders, and the PIN from this browser?")) return;
              clearPersonal();
              void postCredentials({ action: "clear", service: "all" });
              log("Delete personal data", "success");
            }}
          >
            Delete personal data and keys
          </GhostButton>
        </Card>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
      </div>
    </div>
  );
}

export function LockScreen() {
  const { replace } = useNav();
  const pinHash = useJarvis((state) => state.pinHash);
  const pinSalt = useJarvis((state) => state.pinSalt);
  const webauthnId = useJarvis((state) => state.webauthnId);
  const setUnlocked = useJarvis((state) => state.setUnlocked);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const unlock = () => {
    setUnlocked(true);
    replace("home");
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6">
      <h1 className="text-center font-display text-xl text-primary">Locked</h1>
      <p className="mt-2 text-center text-sm text-muted">This lock stays on this device. It is not an account login.</p>
      {pinHash && pinSalt ? (
        <input value={pin} onChange={(event) => setPin(event.target.value)} inputMode="numeric" placeholder="PIN" className="mt-6 h-12 rounded-2xl border border-border bg-surface px-4 text-center text-fg" />
      ) : null}
      {error ? <p className="mt-3 text-center text-sm text-danger">{error}</p> : null}
      <div className="mt-4 flex flex-col gap-2">
        {pinHash && pinSalt ? (
          <PrimaryButton
            onClick={() => {
              void hashPin(pin.trim(), pinSalt).then((hash) => {
                if (hash === pinHash) unlock();
                else setError("That PIN does not match.");
              });
            }}
          >
            Unlock
          </PrimaryButton>
        ) : null}
        {webauthnId ? (
          <GhostButton
            onClick={() => {
              let binary = "";
              try {
                binary = atob(webauthnId);
              } catch {
                setError("The saved device credential is unreadable.");
                return;
              }
              const bytes = new Uint8Array(binary.length);
              for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
              void navigator.credentials
                .get({
                  publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    allowCredentials: [{ type: "public-key", id: bytes }],
                    userVerification: "required",
                    timeout: 60000,
                  },
                })
                .then((cred) => {
                  if (cred) unlock();
                  else setError("Device unlock did not return a credential.");
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "Device unlock failed."));
            }}
          >
            Use device unlock
          </GhostButton>
        ) : null}
      </div>
    </div>
  );
}
