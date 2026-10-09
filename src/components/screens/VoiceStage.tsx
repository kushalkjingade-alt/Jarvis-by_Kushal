import { Mic, Square } from "lucide-react";
import { useAssistant } from "@/components/app/assistant";
import { JarvisOrb } from "@/components/orb/JarvisOrb";
import { GhostButton } from "@/components/ui";
import { useJarvis } from "@/lib/store";
import type { OrbMode } from "@/components/orb/orb-scene";

export function VoiceStage({ mode }: { mode: Extract<OrbMode, "listening" | "processing" | "speaking"> }) {
  const assistant = useAssistant();
  const orb = useJarvis((state) => state.orb);
  const reduceMotion = useJarvis((state) => state.reduceMotion);
  const messages = useJarvis((state) => state.messages);
  const latest = [...messages].reverse().find((message) => message.role === "assistant");
  const title = mode === "listening" ? "Listening…" : mode === "processing" ? "Processing…" : "Speaking…";
  const caption =
    mode === "listening"
      ? assistant.transcript || "Speak now"
      : mode === "processing"
        ? "Analyzing your command…"
        : latest?.text || "Here is what I found.";

  return (
    <div className="flex min-h-full flex-col items-center px-5 pb-8">
      <p className="pt-6 font-display text-xs tracking-widest text-primary">JARVIS BY KUSHAL</p>
      <p className="mt-1 text-xs text-accent">{title}</p>
      <JarvisOrb className="mt-4" live={{ ...orb, mode, reduceMotion }} />
      <p className="mt-4 max-h-40 overflow-y-auto text-center text-sm text-fg">{caption}</p>
      {assistant.ttsNote && mode === "speaking" ? <p className="mt-2 text-center text-xs text-muted">{assistant.ttsNote}</p> : null}
      {assistant.audioSource === "device-tts" && mode === "speaking" ? (
        <p className="mt-1 text-center text-xs text-primary">Device voice — not Gemini audio</p>
      ) : null}
      {assistant.error ? <p className="mt-3 text-center text-sm text-danger">{assistant.error}</p> : null}
      <div className="mt-auto flex flex-col items-center gap-3">
        {mode === "listening" ? (
          <div className="grid size-20 place-items-center rounded-full border border-primary text-primary">
            <Mic className="size-7" />
          </div>
        ) : (
          <button type="button" onClick={assistant.stopAll} className="grid size-20 place-items-center rounded-full border border-primary text-primary" aria-label="Stop">
            <Square className="size-6" />
          </button>
        )}
        {mode === "listening" ? (
          <GhostButton onClick={assistant.cancelListen}>Cancel</GhostButton>
        ) : (
          <GhostButton onClick={assistant.stopAll}>Stop</GhostButton>
        )}
      </div>
    </div>
  );
}
