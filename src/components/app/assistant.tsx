import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { streamReply } from "@/lib/client-api";
import { uid } from "@/lib/id";
import { audioBus } from "@/lib/audio-bus";
import { playDeviceVoice, playGeminiVoice, startListening, stopPlayback } from "@/lib/speech-client";
import { useJarvis } from "@/lib/store";
import type { ScreenId } from "@/lib/types";

type Phase = "idle" | "listening" | "processing" | "speaking";

type AssistantValue = {
  phase: Phase;
  transcript: string;
  error: string;
  audioSource: "gemini-tts" | "device-tts" | null;
  ttsNote: string;
  beginListen: () => void;
  cancelListen: () => void;
  sendText: (text: string, options?: { speak?: boolean }) => Promise<void>;
  stopAll: () => void;
  playText: (text: string, stage?: boolean) => Promise<void>;
  retry: () => Promise<void>;
};

const AssistantContext = createContext<AssistantValue | null>(null);

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("Assistant is unavailable.");
  return value;
}

export function AssistantProvider({
  children,
  navigate,
}: {
  children: ReactNode;
  navigate: (screen: ScreenId) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [audioSource, setAudioSource] = useState<"gemini-tts" | "device-tts" | null>(null);
  const [ttsNote, setTtsNote] = useState("");
  const stopRec = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const lastSpoken = useRef("");

  const blocked = () => {
    const state = useJarvis.getState();
    if (state.offlinePreferred || (typeof navigator !== "undefined" && !navigator.onLine)) {
      setError("Offline mode is on, or there is no connection. Notes and memories still work. Gemini and weather do not.");
      state.logAction("Assistant reply", "failed", "Offline");
      state.setActiveTask("Idle");
      return true;
    }
    return false;
  };

  const speak = async (text: string, stage: boolean) => {
    const voice = useJarvis.getState().voice;
    if (stage) {
      setPhase("speaking");
      navigate("speaking");
    }
    setAudioSource(null);
    setTtsNote("");
    lastSpoken.current = text;
    try {
      const played = await playGeminiVoice({
        text,
        voice: voice.name,
        pace: voice.pace,
        language: voice.language,
        volume: voice.volume,
      });
      setAudioSource("gemini-tts");
      setTtsNote(`Gemini TTS · ${played.model} · ${voice.name}`);
      useJarvis.getState().logAction("Gemini voice", "success", voice.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini voice failed.";
      if (!voice.deviceFallback) {
        setError(message);
        setTtsNote("Gemini audio failed. Device voice is turned off.");
        useJarvis.getState().logAction("Gemini voice", "failed", message.slice(0, 140));
        if (stage) {
          setPhase("idle");
          navigate("chat");
        }
        return;
      }
      try {
        await playDeviceVoice({ text, pace: voice.pace, language: voice.language, volume: voice.volume });
      } catch (deviceError) {
        const deviceMessage = deviceError instanceof Error ? deviceError.message : "Device voice failed.";
        setError(`${message} ${deviceMessage}`);
        useJarvis.getState().logAction("Device voice", "failed", deviceMessage.slice(0, 140));
        if (stage) {
          setPhase("idle");
          navigate("chat");
        }
        return;
      }
      setAudioSource("device-tts");
      setTtsNote("Device text-to-speech. This is not Gemini audio.");
      useJarvis.getState().logAction("Device voice", "success", "Fallback after Gemini TTS failed");
    }
    if (stage) {
      setPhase("idle");
      navigate("chat");
    }
  };

  const sendText = async (text: string, options?: { speak?: boolean }) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (blocked()) return;
    const state = useJarvis.getState();
    const userId = uid();
    const assistantId = uid();
    state.addMessage({ id: userId, role: "user", text: trimmed, at: Date.now() });
    state.addMessage({ id: assistantId, role: "assistant", text: "", at: Date.now(), pending: true });
    state.setActiveTask(options?.speak ? "Voice command" : "Chat");
    setError("");
    setPhase(options?.speak ? "processing" : "idle");
    if (options?.speak) navigate("processing");
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const token = ++seq.current;
    try {
      const snapshot = useJarvis.getState();
      const result = await streamReply(
        {
          messages: snapshot.messages
            .filter((message) => message.id !== assistantId && !message.error && message.text.trim())
            .map((message) => ({ role: message.role, text: message.text })),
          model: snapshot.ai.model,
          style: snapshot.ai.style,
          length: snapshot.ai.length,
          language: snapshot.voice.language,
          displayName: snapshot.displayName,
          studyMode: snapshot.notify.studyMode,
          memories: snapshot.memories.map((item) => ({ title: item.title, body: item.body })),
          grounding: snapshot.ai.grounding,
          weatherCity: snapshot.weatherCity,
        },
        (next) => {
          if (token !== seq.current) return;
          if (!useJarvis.getState().ai.streaming) return;
          useJarvis.getState().patchMessage(assistantId, { text: next, pending: true });
        },
        controller.signal,
      );
      if (token !== seq.current) return;
      useJarvis.getState().patchMessage(assistantId, {
        text: result.text,
        pending: false,
        source: result.source,
        error: false,
      });
      useJarvis.getState().logAction(result.source === "weather" ? "Weather answer" : "Gemini reply", "success");
      if (options?.speak && result.text.trim()) await speak(result.text, true);
      else setPhase("idle");
    } catch (err) {
      if (token !== seq.current || controller.signal.aborted) {
        const current = useJarvis.getState().messages.find((message) => message.id === assistantId);
        useJarvis.getState().patchMessage(assistantId, {
          pending: false,
          text: current?.text || "Stopped.",
        });
        return;
      }
      const message = err instanceof Error ? err.message : "The assistant request failed.";
      useJarvis.getState().patchMessage(assistantId, { text: message, pending: false, error: true });
      useJarvis.getState().logAction("Assistant reply", "failed", message.slice(0, 160));
      setError(message);
      setPhase("idle");
      navigate("chat");
    } finally {
      if (token === seq.current) useJarvis.getState().setActiveTask("Idle");
    }
  };

  const beginListen = () => {
    if (blocked()) {
      navigate("chat");
      return;
    }
    if (useJarvis.getState().voice.interrupt) stopPlayback();
    stopRec.current?.();
    setError("");
    setTranscript("");
    setPhase("listening");
    navigate("listening");
    useJarvis.getState().setActiveTask("Listening");
    let sent = false;
    stopRec.current = startListening({
      language: useJarvis.getState().voice.language,
      onPartial: setTranscript,
      onFinal: (text) => {
        if (sent) return;
        sent = true;
        stopRec.current?.();
        audioBus.set(0);
        if (!text) {
          setError("No speech was detected.");
          setPhase("idle");
          useJarvis.getState().setActiveTask("Idle");
          return;
        }
        setTranscript(text);
        void sendText(text, { speak: true });
      },
      onError: (message) => {
        setError(message);
        useJarvis.getState().logAction("Microphone", "failed", message);
      },
      onEnd: () => {
        if (!sent && phase !== "processing") {
          useJarvis.getState().setActiveTask("Idle");
        }
      },
    });
  };

  const cancelListen = () => {
    stopRec.current?.();
    stopRec.current = null;
    audioBus.set(0);
    setPhase("idle");
    setTranscript("");
    useJarvis.getState().setActiveTask("Idle");
    navigate("home");
  };

  const stopAll = () => {
    seq.current += 1;
    abortRef.current?.abort();
    stopRec.current?.();
    stopPlayback();
    setPhase("idle");
    useJarvis.getState().setActiveTask("Idle");
    navigate("chat");
  };

  const playText = async (text: string, stage = true) => {
    if (!text.trim()) return;
    await speak(text, stage);
  };

  const retry = async () => {
    const messages = useJarvis.getState().messages;
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUser) return;
    await sendText(lastUser.text, { speak: false });
  };

  return (
    <AssistantContext.Provider
      value={{ phase, transcript, error, audioSource, ttsNote, beginListen, cancelListen, sendText, stopAll, playText, retry }}
    >
      {children}
    </AssistantContext.Provider>
  );
}
