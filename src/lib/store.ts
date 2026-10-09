import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { DEFAULT_TEXT_MODEL } from "@/lib/models";
import { DEFAULT_VOICE } from "@/lib/voices";
import type {
  ActionLog,
  ActionStatus,
  AiPrefs,
  ChatMessage,
  MemoryItem,
  MemoryTag,
  NoteItem,
  NotifyPrefs,
  OrbPrefs,
  ReminderItem,
  VoicePrefs,
  WeatherReport,
} from "@/lib/types";

const DEFAULT_APPS: NotifyPrefs["apps"] = [
  { id: "whatsapp", name: "WhatsApp", autoReply: false },
  { id: "telegram", name: "Telegram", autoReply: false },
  { id: "instagram", name: "Instagram", autoReply: false },
  { id: "other", name: "Other apps", autoReply: false },
];

type Persisted = {
  onboarded: boolean;
  displayName: string;
  sleeping: boolean;
  offlinePreferred: boolean;
  micExplained: boolean;
  textScale: "sm" | "md" | "lg";
  reduceMotion: boolean;
  weatherCity: string;
  orb: OrbPrefs;
  voice: VoicePrefs;
  ai: AiPrefs;
  notify: NotifyPrefs;
  memories: MemoryItem[];
  messages: ChatMessage[];
  actions: ActionLog[];
  notes: NoteItem[];
  reminders: ReminderItem[];
  lastWeather: WeatherReport | null;
  pinHash: string | null;
  pinSalt: string | null;
  webauthnId: string | null;
};

type JarvisState = Persisted & {
  unlocked: boolean;
  activeTask: string;
  setOnboarded: (value: boolean) => void;
  setDisplayName: (value: string) => void;
  setSleeping: (value: boolean) => void;
  setOfflinePreferred: (value: boolean) => void;
  setMicExplained: (value: boolean) => void;
  setTextScale: (value: Persisted["textScale"]) => void;
  setReduceMotion: (value: boolean) => void;
  setWeatherCity: (value: string) => void;
  setLastWeather: (report: WeatherReport | null) => void;
  patchOrb: (patch: Partial<OrbPrefs>) => void;
  patchVoice: (patch: Partial<VoicePrefs>) => void;
  patchAi: (patch: Partial<AiPrefs>) => void;
  patchNotify: (patch: Partial<NotifyPrefs>) => void;
  setNotifyApp: (id: string, autoReply: boolean) => void;
  addMemory: (input: { title: string; body: string; tag: MemoryTag }) => void;
  updateMemory: (id: string, patch: { title: string; body: string; tag: MemoryTag }) => void;
  deleteMemory: (id: string) => void;
  addMessage: (message: ChatMessage) => void;
  patchMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  logAction: (name: string, status: ActionStatus, detail?: string) => void;
  clearActions: () => void;
  saveNote: (input: { id?: string; title: string; body: string }) => void;
  deleteNote: (id: string) => void;
  addReminder: (title: string, at: number) => void;
  completeReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  setPin: (pinHash: string | null, pinSalt: string | null) => void;
  setWebauthnId: (id: string | null) => void;
  setUnlocked: (value: boolean) => void;
  setActiveTask: (value: string) => void;
  clearPersonal: () => void;
};

const persistedDefaults: Persisted = {
  onboarded: false,
  displayName: "",
  sleeping: false,
  offlinePreferred: false,
  micExplained: false,
  textScale: "md",
  reduceMotion: false,
  weatherCity: "",
  orb: {
    size: "medium",
    speed: 70,
    glow: "medium",
    particles: true,
    rays: true,
    rings: true,
    voiceReactive: true,
    battery: false,
  },
  voice: {
    name: DEFAULT_VOICE,
    pace: 1,
    language: "en",
    volume: 0.8,
    interrupt: true,
    deviceFallback: true,
  },
  ai: {
    model: DEFAULT_TEXT_MODEL,
    style: "balanced",
    length: "medium",
    streaming: true,
    grounding: false,
  },
  notify: {
    studyMode: false,
    quietStart: "22:00",
    quietEnd: "07:00",
    apps: DEFAULT_APPS,
    template: "I'm currently busy. I'll get back to you soon.",
  },
  memories: [],
  messages: [],
  actions: [],
  notes: [],
  reminders: [],
  lastWeather: null,
  pinHash: null,
  pinSalt: null,
  webauthnId: null,
};

function trimActions(actions: ActionLog[]): ActionLog[] {
  return actions.slice(0, 100);
}

export const useJarvis = create<JarvisState>()(
  persist(
    (set) => ({
      ...persistedDefaults,
      unlocked: false,
      activeTask: "Idle",
      setOnboarded: (onboarded) => set({ onboarded }),
      setDisplayName: (displayName) => set({ displayName }),
      setSleeping: (sleeping) => set({ sleeping }),
      setOfflinePreferred: (offlinePreferred) => set({ offlinePreferred }),
      setMicExplained: (micExplained) => set({ micExplained }),
      setTextScale: (textScale) => set({ textScale }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setWeatherCity: (weatherCity) => set({ weatherCity }),
      setLastWeather: (lastWeather) => set({ lastWeather }),
      patchOrb: (patch) => set((state) => ({ orb: { ...state.orb, ...patch } })),
      patchVoice: (patch) => set((state) => ({ voice: { ...state.voice, ...patch } })),
      patchAi: (patch) => set((state) => ({ ai: { ...state.ai, ...patch } })),
      patchNotify: (patch) => set((state) => ({ notify: { ...state.notify, ...patch } })),
      setNotifyApp: (id, autoReply) =>
        set((state) => ({
          notify: {
            ...state.notify,
            apps: state.notify.apps.map((app) => (app.id === id ? { ...app, autoReply } : app)),
          },
        })),
      addMemory: ({ title, body, tag }) =>
        set((state) => ({
          memories: [
            { id: uid(), title, body, tag, createdAt: Date.now(), updatedAt: Date.now() },
            ...state.memories,
          ].slice(0, 100),
        })),
      updateMemory: (id, patch) =>
        set((state) => ({
          memories: state.memories.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item,
          ),
        })),
      deleteMemory: (id) => set((state) => ({ memories: state.memories.filter((item) => item.id !== id) })),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message].slice(-200) })),
      patchMessage: (id, patch) =>
        set((state) => ({
          messages: state.messages.map((message) => (message.id === id ? { ...message, ...patch } : message)),
        })),
      clearMessages: () => set({ messages: [] }),
      logAction: (name, status, detail) =>
        set((state) => ({
          actions: trimActions([{ id: uid(), name, at: Date.now(), status, detail }, ...state.actions]),
        })),
      clearActions: () => set({ actions: [] }),
      saveNote: ({ id, title, body }) =>
        set((state) => {
          if (id) {
            return {
              notes: state.notes.map((note) => (note.id === id ? { ...note, title, body, updatedAt: Date.now() } : note)),
            };
          }
          return {
            notes: [{ id: uid(), title, body, updatedAt: Date.now() }, ...state.notes].slice(0, 100),
          };
        }),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),
      addReminder: (title, at) =>
        set((state) => ({
          reminders: [...state.reminders, { id: uid(), title, at, done: false }].slice(-50),
        })),
      completeReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.map((item) => (item.id === id ? { ...item, done: true } : item)),
        })),
      deleteReminder: (id) =>
        set((state) => ({ reminders: state.reminders.filter((item) => item.id !== id) })),
      setPin: (pinHash, pinSalt) => set({ pinHash, pinSalt }),
      setWebauthnId: (webauthnId) => set({ webauthnId }),
      setUnlocked: (unlocked) => set({ unlocked }),
      setActiveTask: (activeTask) => set({ activeTask }),
      clearPersonal: () =>
        set({
          displayName: "",
          memories: [],
          messages: [],
          actions: [],
          notes: [],
          reminders: [],
          lastWeather: null,
          pinHash: null,
          pinSalt: null,
          webauthnId: null,
          unlocked: false,
          weatherCity: "",
        }),
    }),
    {
      name: "jarvis-by-kushal",
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        onboarded: state.onboarded,
        displayName: state.displayName,
        sleeping: state.sleeping,
        offlinePreferred: state.offlinePreferred,
        micExplained: state.micExplained,
        textScale: state.textScale,
        reduceMotion: state.reduceMotion,
        weatherCity: state.weatherCity,
        orb: state.orb,
        voice: state.voice,
        ai: state.ai,
        notify: state.notify,
        memories: state.memories,
        messages: state.messages,
        actions: state.actions,
        notes: state.notes,
        reminders: state.reminders,
        lastWeather: state.lastWeather,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        webauthnId: state.webauthnId,
      }),
    },
  ),
);

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
