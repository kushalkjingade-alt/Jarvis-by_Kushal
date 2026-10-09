import { useState } from "react";
import { useAssistant } from "@/components/app/assistant";
import { useNav } from "@/components/app/nav";
import { JarvisOrb } from "@/components/orb/JarvisOrb";
import { Choice, ErrorNote, Field, GhostButton, PrimaryButton, ScreenHeader, SliderRow, ToggleRow } from "@/components/ui";
import { postCredentials } from "@/lib/client-api";
import { TEXT_MODELS } from "@/lib/models";
import { useJarvis } from "@/lib/store";
import { DEFAULT_VOICE, GEMINI_VOICES } from "@/lib/voices";

export function OrbSettingsScreen() {
  const { back } = useNav();
  const orb = useJarvis((state) => state.orb);
  const patch = useJarvis((state) => state.patchOrb);
  const reduceMotion = useJarvis((state) => state.reduceMotion);
  return (
    <div className="min-h-full">
      <ScreenHeader title="Orb and animation" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <JarvisOrb live={{ ...orb, mode: "idle", reduceMotion }} className="w-48" />
        <Choice
          value={orb.size}
          onChange={(id) => patch({ size: id as typeof orb.size })}
          options={[
            { id: "small", label: "Small" },
            { id: "medium", label: "Medium" },
            { id: "large", label: "Large" },
          ]}
        />
        <Choice
          value={orb.glow}
          onChange={(id) => patch({ glow: id as typeof orb.glow })}
          options={[
            { id: "low", label: "Low glow" },
            { id: "medium", label: "Medium" },
            { id: "high", label: "High" },
          ]}
        />
        <SliderRow label="Orbit speed" min={10} max={100} step={1} value={orb.speed} onChange={(speed) => patch({ speed })} />
        <ToggleRow label="Particles" checked={orb.particles} onChange={(particles) => patch({ particles })} />
        <ToggleRow label="Energy rays" checked={orb.rays} onChange={(rays) => patch({ rays })} />
        <ToggleRow label="Holographic rings" checked={orb.rings} onChange={(rings) => patch({ rings })} />
        <ToggleRow label="Voice-reactive glow" detail="Uses the microphone or playback level, not a random timer." checked={orb.voiceReactive} onChange={(voiceReactive) => patch({ voiceReactive })} />
        <ToggleRow label="Battery-friendly mode" detail="Fewer effects and a slower orbit." checked={orb.battery} onChange={(battery) => patch({ battery })} />
      </div>
    </div>
  );
}

export function VoiceSettingsScreen() {
  const { back } = useNav();
  const voice = useJarvis((state) => state.voice);
  const patch = useJarvis((state) => state.patchVoice);
  const { playText, ttsNote, error, stopAll } = useAssistant();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const known = GEMINI_VOICES.some((item) => item.name === voice.name);

  return (
    <div className="min-h-full">
      <ScreenHeader title="Voice settings" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <p className="text-sm text-muted">
          These are the documented Gemini prebuilt studio voices for {`gemini-3.8-flash-tts`}. Real-time Gemini Live audio
          is not used here, because that socket would need your API key in the browser. Speech in, Gemini text, then Gemini
          TTS is the path instead.
        </p>
        {!known ? <ErrorNote>The saved voice is not in the studio list. Pick another one.</ErrorNote> : null}
        <label className="block text-sm text-muted">
          Gemini voice
          <select className="mt-1 h-12 w-full rounded-2xl border border-border bg-bg px-3 text-fg" value={known ? voice.name : DEFAULT_VOICE} onChange={(event) => patch({ name: event.target.value })}>
            {GEMINI_VOICES.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} — {item.trait}
              </option>
            ))}
          </select>
        </label>
        <SliderRow label="Pace" min={0.7} max={1.5} step={0.05} value={Number(voice.pace.toFixed(2))} onChange={(pace) => patch({ pace })} />
        <p className="text-xs text-muted">Gemini receives this as a speaking-style hint. Device voices use the numeric rate.</p>
        <SliderRow label="Playback volume" min={0} max={1} step={0.05} value={Number(voice.volume.toFixed(2))} onChange={(volume) => patch({ volume })} />
        <Choice
          value={voice.language}
          onChange={(id) => patch({ language: id as typeof voice.language })}
          options={[
            { id: "en", label: "English" },
            { id: "hi", label: "Hindi" },
            { id: "hi-en", label: "Hindi + English" },
          ]}
        />
        <ToggleRow label="Interrupt playback when listening" checked={voice.interrupt} onChange={(interrupt) => patch({ interrupt })} />
        <ToggleRow label="Allow device voice if Gemini TTS fails" detail="The screen will say it is device text-to-speech, not Gemini." checked={voice.deviceFallback} onChange={(deviceFallback) => patch({ deviceFallback })} />
        {ttsNote ? <p className="text-xs text-primary">{ttsNote}</p> : null}
        {localError || error ? <ErrorNote>{localError || error}</ErrorNote> : null}
        <div className="flex flex-wrap gap-2">
          <PrimaryButton
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setLocalError("");
              const line = voice.language === "hi" ? "Namaste. Main JARVIS BY KUSHAL hoon." : "Hello. I am JARVIS BY KUSHAL.";
              void playText(line, false)
                .catch((err: unknown) => setLocalError(err instanceof Error ? err.message : "Preview failed."))
                .finally(() => setBusy(false));
            }}
          >
            Preview voice
          </PrimaryButton>
          <GhostButton onClick={() => patch({ name: DEFAULT_VOICE, pace: 1 })}>Restore default</GhostButton>
          <GhostButton onClick={stopAll}>Stop</GhostButton>
        </div>
      </div>
    </div>
  );
}

export function AiConfigScreen() {
  const { back, openSetup } = useNav();
  const ai = useJarvis((state) => state.ai);
  const patch = useJarvis((state) => state.patchAi);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-full">
      <ScreenHeader title="AI configuration" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <label className="block text-sm text-muted">
          Model
          <select className="mt-1 h-12 w-full rounded-2xl border border-border bg-bg px-3 text-fg" value={ai.model} onChange={(event) => patch({ model: event.target.value })}>
            {TEXT_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted">{TEXT_MODELS.find((model) => model.id === ai.model)?.note}</p>
        <p className="text-sm text-muted">Response style</p>
        <Choice
          value={ai.style}
          onChange={(id) => patch({ style: id as typeof ai.style })}
          options={[
            { id: "creative", label: "Creative" },
            { id: "balanced", label: "Balanced" },
            { id: "precise", label: "Precise" },
          ]}
        />
        <p className="text-sm text-muted">Response length</p>
        <Choice
          value={ai.length}
          onChange={(id) => patch({ length: id as typeof ai.length })}
          options={[
            { id: "short", label: "Short" },
            { id: "medium", label: "Medium" },
            { id: "detailed", label: "Detailed" },
          ]}
        />
        <ToggleRow label="Show text as it arrives" detail="When off, the reply appears after Gemini finishes." checked={ai.streaming} onChange={(streaming) => patch({ streaming })} />
        <PrimaryButton
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            setMessage("");
            void postCredentials({ action: "test", service: "gemini" }).then((result) => {
              setBusy(false);
              if (!result.ok) setError(result.error || "Gemini test failed.");
              else setMessage("Gemini responded to a live test just now.");
            });
          }}
        >
          Test Gemini connection
        </PrimaryButton>
        {message ? <p className="text-sm text-accent">{message}</p> : null}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <GhostButton onClick={() => openSetup("manage")}>Update API key</GhostButton>
      </div>
    </div>
  );
}

export function AppearanceScreen() {
  const { back } = useNav();
  const scale = useJarvis((state) => state.textScale);
  const setScale = useJarvis((state) => state.setTextScale);
  const reduce = useJarvis((state) => state.reduceMotion);
  const setReduce = useJarvis((state) => state.setReduceMotion);
  return (
    <div className="min-h-full">
      <ScreenHeader title="Appearance" onBack={back} />
      <div className="space-y-4 px-4 pb-6">
        <p className="text-sm text-muted">JARVIS BY KUSHAL stays on the amber-on-black theme so the orb and text keep their contrast.</p>
        <Choice
          value={scale}
          onChange={(id) => setScale(id as typeof scale)}
          options={[
            { id: "sm", label: "Compact" },
            { id: "md", label: "Default" },
            { id: "lg", label: "Large text" },
          ]}
        />
        <ToggleRow label="Reduce motion" detail="Slows the orb and screen transitions." checked={reduce} onChange={setReduce} />
      </div>
    </div>
  );
}

export function PersonalizationScreen() {
  const { back } = useNav();
  const name = useJarvis((state) => state.displayName);
  const setName = useJarvis((state) => state.setDisplayName);
  return (
    <div className="min-h-full">
      <ScreenHeader title="Personalization" onBack={back} />
      <div className="space-y-3 px-4">
        <Field label="What should JARVIS call you?" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
        <p className="text-xs text-muted">Saved on this device only. It is sent with chat requests so replies can use it.</p>
      </div>
    </div>
  );
}
