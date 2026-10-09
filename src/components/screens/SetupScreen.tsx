import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useNav } from "@/components/app/nav";
import { Card, ErrorNote, GhostButton, PrimaryButton, ScreenHeader, StatusPill } from "@/components/ui";
import { fetchStatus, postCredentials } from "@/lib/client-api";
import { TEXT_MODELS } from "@/lib/models";
import { useJarvis } from "@/lib/store";
import type { CredentialStatus } from "@/lib/types";

const empty: CredentialStatus = {
  gemini: { configured: false, verifiedAt: null, hint: null, model: null },
  weather: { configured: false, verifiedAt: null, hint: null, provider: null },
  seal: "builtin",
};

export function SetupScreen() {
  const { setupMode, back, replace } = useNav();
  const setModel = useJarvis((state) => state.patchAi);
  const model = useJarvis((state) => state.ai.model);
  const [status, setStatus] = useState<CredentialStatus>(empty);
  const [geminiKey, setGeminiKey] = useState("");
  const [weatherKey, setWeatherKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [provider, setProvider] = useState<"open-meteo" | "openweather">("open-meteo");
  const [busy, setBusy] = useState<"gemini" | "weather" | "clear" | null>(null);
  const [geminiError, setGeminiError] = useState("");
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    void fetchStatus()
      .then((next) => {
        setStatus(next);
        if (next.weather.provider) setProvider(next.weather.provider);
        if (next.gemini.model) setModel({ model: next.gemini.model });
      })
      .catch((error: unknown) => {
        setGeminiError(error instanceof Error ? error.message : "Could not load setup status.");
      });
  }, [setModel]);

  const ready = status.gemini.configured && status.weather.configured;

  return (
    <div className="flex min-h-full flex-col">
      {setupMode === "manage" ? <ScreenHeader title="API management" onBack={back} /> : <div className="h-6" />}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-6">
        <div>
          <h1 className="font-display text-xl text-fg">Connect JARVIS</h1>
          <p className="mt-2 text-sm text-muted">
            Gemini is required for conversation. Weather is required too: Open-Meteo needs no key, OpenWeather is optional
            and needs one. A key is saved only after a real request succeeds.
          </p>
        </div>
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm text-fg">Google Gemini</h2>
            <StatusPill ok={status.gemini.configured ? true : geminiError ? false : null} label={status.gemini.configured ? "Connected" : "Not connected"} />
          </div>
          <p className="text-xs text-muted">Powers chat, voice replies, and image analysis. The key never goes into page storage.</p>
          {status.gemini.hint ? <p className="text-xs text-primary">Saved key {status.gemini.hint}</p> : null}
          <label className="block text-sm text-muted">
            Model
            <select
              className="mt-1 h-12 w-full rounded-2xl border border-border bg-bg px-3 text-fg"
              value={model}
              onChange={(event) => setModel({ model: event.target.value })}
            >
              {TEXT_MODELS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            API key
            <span className="mt-1 flex h-12 items-center rounded-2xl border border-border bg-bg px-3">
              <input
                className="h-full w-full bg-transparent text-fg outline-none"
                type={showGemini ? "text" : "password"}
                autoComplete="off"
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                placeholder="Paste a Google AI Studio key"
              />
              <button type="button" className="grid size-11 place-items-center text-muted" onClick={() => setShowGemini((value) => !value)} aria-label={showGemini ? "Hide key" : "Show key"}>
                {showGemini ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          {geminiError ? <ErrorNote>{geminiError}</ErrorNote> : null}
          <PrimaryButton
            className="w-full"
            disabled={busy !== null}
            onClick={() => {
              setBusy("gemini");
              setGeminiError("");
              void postCredentials({ action: "save-gemini", apiKey: geminiKey, model }).then((result) => {
                setBusy(null);
                if (!result.ok || !result.status) {
                  setGeminiError(result.error || "Validation failed.");
                  return;
                }
                setStatus(result.status);
                setGeminiKey("");
                useJarvis.getState().logAction("Gemini validation", "success", model);
              });
            }}
          >
            {busy === "gemini" ? <Loader2 className="size-4 animate-spin" /> : null}
            Save and validate
          </PrimaryButton>
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm text-fg">Weather</h2>
            <StatusPill ok={status.weather.configured ? true : weatherError ? false : null} label={status.weather.configured ? "Connected" : "Not connected"} />
          </div>
          <p className="text-xs text-muted">
            Open-Meteo is checked with a live Bengaluru forecast and does not use a key. OpenWeather is optional. You can
            skip the key by staying on Open-Meteo.
          </p>
          <div className="flex gap-2">
            <button type="button" className={provider === "open-meteo" ? "h-10 flex-1 rounded-full bg-primary text-sm text-bg" : "h-10 flex-1 rounded-full border border-border text-sm"} onClick={() => setProvider("open-meteo")}>
              Open-Meteo
            </button>
            <button type="button" className={provider === "openweather" ? "h-10 flex-1 rounded-full bg-primary text-sm text-bg" : "h-10 flex-1 rounded-full border border-border text-sm"} onClick={() => setProvider("openweather")}>
              OpenWeather
            </button>
          </div>
          {provider === "openweather" ? (
            <label className="block text-sm text-muted">
              API key
              <span className="mt-1 flex h-12 items-center rounded-2xl border border-border bg-bg px-3">
                <input
                  className="h-full w-full bg-transparent text-fg outline-none"
                  type={showWeather ? "text" : "password"}
                  autoComplete="off"
                  value={weatherKey}
                  onChange={(event) => setWeatherKey(event.target.value)}
                />
                <button type="button" className="grid size-11 place-items-center text-muted" onClick={() => setShowWeather((value) => !value)} aria-label={showWeather ? "Hide weather key" : "Show weather key"}>
                  {showWeather ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
          ) : null}
          {status.weather.hint ? <p className="text-xs text-primary">Saved weather key {status.weather.hint}</p> : null}
          {weatherError ? <ErrorNote>{weatherError}</ErrorNote> : null}
          <PrimaryButton
            className="w-full"
            disabled={busy !== null}
            onClick={() => {
              setBusy("weather");
              setWeatherError("");
              void postCredentials({
                action: "save-weather",
                provider,
                apiKey: provider === "openweather" ? weatherKey : "",
              }).then((result) => {
                setBusy(null);
                if (!result.ok || !result.status) {
                  setWeatherError(result.error || "Weather check failed.");
                  useJarvis.getState().logAction("Weather validation", "failed", result.error);
                  return;
                }
                setStatus(result.status);
                setWeatherKey("");
                useJarvis.getState().logAction("Weather validation", "success", provider);
              });
            }}
          >
            {busy === "weather" ? <Loader2 className="size-4 animate-spin" /> : null}
            {provider === "open-meteo" ? "Validate Open-Meteo" : "Save and validate"}
          </PrimaryButton>
        </Card>
        <Card>
          <h2 className="text-sm text-fg">Where keys live</h2>
          <p className="mt-2 text-xs text-muted">
            A successful check seals the key in an httpOnly cookie. Page JavaScript cannot read it, and it is not stored in
            localStorage or in the app bundle. The server uses it only to call Gemini or OpenWeather.{" "}
            {status.seal === "env"
              ? "This server has a private seal secret."
              : "This server is using a built-in development seal, not a hardware vault. Anyone with both this browser's cookies and the server code could decrypt the key."}{" "}
            Clearing site data, or Clear below, removes it.
          </p>
          <GhostButton
            className="mt-3"
            disabled={busy !== null}
            onClick={() => {
              setBusy("clear");
              void postCredentials({ action: "clear", service: "all" }).then((result) => {
                setBusy(null);
                if (result.status) setStatus(result.status);
              });
            }}
          >
            Clear saved keys
          </GhostButton>
        </Card>
        {setupMode === "first" ? (
          <PrimaryButton className="w-full" disabled={!ready} onClick={() => replace(useJarvis.getState().pinHash ? "lock" : "home")}>
            Continue
          </PrimaryButton>
        ) : (
          <GhostButton className="w-full" onClick={back}>
            Done
          </GhostButton>
        )}
      </div>
    </div>
  );
}
