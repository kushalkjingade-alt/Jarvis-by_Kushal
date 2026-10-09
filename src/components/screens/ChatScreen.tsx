import { useState } from "react";
import { Mic, RotateCcw, Send, Volume2 } from "lucide-react";
import { useAssistant } from "@/components/app/assistant";
import { ScreenHeader } from "@/components/ui";
import { useJarvis } from "@/lib/store";
import { cn } from "@/lib/cn";

const STARTERS = ["What's the weather in Bengaluru?", "Will it rain today?", "Help me plan a short study session."];

export function ChatScreen() {
  const { sendText, beginListen, retry, playText, error, stopAll } = useAssistant();
  const messages = useJarvis((state) => state.messages);
  const grounding = useJarvis((state) => state.ai.grounding);
  const patchAi = useJarvis((state) => state.patchAi);
  const [draft, setDraft] = useState("");
  const pending = messages.some((message) => message.pending);

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="Chat with JARVIS" subtitle={grounding ? "Web search grounding on" : "Gemini text"} />
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3">
        {messages.length === 0 ? (
          <div className="space-y-2 pt-6">
            <p className="text-sm text-muted">Ask something. Weather questions use the weather service, not a guessed forecast.</p>
            {STARTERS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void sendText(prompt)} className="block w-full rounded-2xl border border-border px-4 py-3 text-left text-sm text-fg">
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} className={cn("max-w-[90%] rounded-3xl px-4 py-3 text-sm", message.role === "user" ? "ml-auto bg-primary text-bg" : "bg-surface text-fg")}>
            <p className="whitespace-pre-wrap">{message.pending && !message.text ? "Thinking…" : message.text}</p>
            {message.role === "assistant" && message.source ? (
              <p className={cn("mt-2 text-xs", message.role === "assistant" ? "text-muted" : "")}>
                {message.source === "weather" ? "Weather service" : message.source === "device" ? "Device" : "Gemini"}
                {message.audioSource === "device-tts" ? " · spoken with device voice" : ""}
                {message.audioSource === "gemini-tts" ? " · Gemini audio" : ""}
              </p>
            ) : null}
            {message.role === "assistant" && message.text && !message.pending ? (
              <button type="button" className="mt-2 inline-flex h-10 items-center gap-2 text-xs text-primary" onClick={() => void playText(message.text, true)}>
                <Volume2 className="size-4" /> Play
              </button>
            ) : null}
          </div>
        ))}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
      <div className="space-y-2 px-4 pb-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={grounding} onChange={(event) => patchAi({ grounding: event.target.checked })} />
          Ground answers with Google Search when Gemini supports it
        </label>
        <div className="flex items-end gap-2">
          <button type="button" className="grid size-12 shrink-0 place-items-center rounded-full border border-border text-primary" aria-label="Voice" onClick={beginListen}>
            <Mic className="size-5" />
          </button>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="Type a message…"
            className="min-h-12 flex-1 resize-none rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none"
          />
          <button
            type="button"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-bg disabled:opacity-40"
            aria-label={pending ? "Retry" : "Send"}
            disabled={!draft.trim() && !pending}
            onClick={() => {
              if (pending) return;
              const text = draft;
              setDraft("");
              void sendText(text);
            }}
          >
            <Send className="size-5" />
          </button>
        </div>
        {pending ? (
          <button type="button" onClick={stopAll} className="text-xs text-primary">
            Stop generation
          </button>
        ) : (
          <button type="button" onClick={() => void retry()} className="inline-flex h-10 items-center gap-2 text-xs text-muted">
            <RotateCcw className="size-4" /> Retry last request
          </button>
        )}
      </div>
    </div>
  );
}
