import { audioBus } from "@/lib/audio-bus";
import type { AssistantLanguage } from "@/lib/types";

type RecInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function recognitionCtor(): (new () => RecInstance) | null {
  const win = window as Window & {
    SpeechRecognition?: new () => RecInstance;
    webkitSpeechRecognition?: new () => RecInstance;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function speechRecognitionAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(recognitionCtor());
}

export function deviceTtsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export async function ensureMicrophone(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot request a microphone.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

export function startListening(input: {
  language: AssistantLanguage;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    input.onError("Speech recognition is not available in this browser. You can still type.");
    input.onEnd();
    return () => undefined;
  }
  const rec = new Ctor();
  rec.lang = input.language === "hi" ? "hi-IN" : "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (event) => {
    let text = "";
    let final = false;
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const row = event.results[index];
      if (!row) continue;
      text += row[0]?.transcript ?? "";
      if (row.isFinal) final = true;
    }
    audioBus.set(Math.min(1, text.length / 40));
    if (final) input.onFinal(text.trim());
    else input.onPartial(text.trim());
  };
  rec.onerror = (event) => {
    const reason = event.error;
    if (reason === "not-allowed") input.onError("Microphone permission was denied.");
    else if (reason === "no-speech") input.onError("No speech was detected. Try again.");
    else if (reason === "network") input.onError("Browser speech recognition needs a network connection.");
    else input.onError(`Speech recognition stopped (${reason}).`);
  };
  rec.onend = () => input.onEnd();
  rec.start();
  return () => rec.abort();
}

let activeAudio: HTMLAudioElement | null = null;
let levelTimer = 0;

export function stopPlayback() {
  activeAudio?.pause();
  activeAudio = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  window.clearInterval(levelTimer);
  audioBus.set(0);
}

export async function playGeminiVoice(input: {
  text: string;
  voice: string;
  pace: number;
  language: AssistantLanguage;
  volume: number;
}): Promise<{ model: string }> {
  stopPlayback();
  const response = await fetch("/api/speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    let message = "Gemini voice failed.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      message = `Gemini voice failed (${response.status}).`;
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0, input.volume));
  activeAudio = audio;
  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  analyser.connect(context.destination);
  const bins = new Uint8Array(analyser.frequencyBinCount);
  levelTimer = window.setInterval(() => {
    analyser.getByteFrequencyData(bins);
    const average = bins.reduce((sum, value) => sum + value, 0) / bins.length / 255;
    audioBus.set(average);
  }, 80);
  await context.resume();
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onpause = () => resolve();
    audio.onerror = () => reject(new Error("The browser could not play the Gemini audio."));
    void audio.play().catch(reject);
  });
  window.clearInterval(levelTimer);
  audioBus.set(0);
  URL.revokeObjectURL(url);
  if (activeAudio === audio) activeAudio = null;
  void context.close();
  return { model: response.headers.get("x-jarvis-tts-model") || "gemini-tts" };
}

export function playDeviceVoice(input: {
  text: string;
  pace: number;
  language: AssistantLanguage;
  volume: number;
}): Promise<void> {
  stopPlayback();
  if (!deviceTtsAvailable()) {
    return Promise.reject(new Error("This browser has no text-to-speech voice."));
  }
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(input.text);
    utterance.rate = Math.min(1.6, Math.max(0.7, input.pace));
    utterance.volume = Math.min(1, Math.max(0, input.volume));
    utterance.lang = input.language === "hi" ? "hi-IN" : "en-US";
    utterance.onboundary = () => audioBus.set(0.45);
    utterance.onend = () => {
      audioBus.set(0);
      resolve();
    };
    utterance.onerror = () => {
      audioBus.set(0);
      reject(new Error("Device text-to-speech failed."));
    };
    window.speechSynthesis.speak(utterance);
  });
}
