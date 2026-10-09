export type ScreenId =
  | "splash"
  | "onboarding"
  | "setup"
  | "home"
  | "listening"
  | "processing"
  | "speaking"
  | "chat"
  | "tools"
  | "apps"
  | "memory"
  | "analysis"
  | "notifications"
  | "settings"
  | "orb-settings"
  | "voice-settings"
  | "ai-config"
  | "privacy"
  | "system"
  | "offline"
  | "history"
  | "weather"
  | "appearance"
  | "personalization"
  | "device"
  | "notes"
  | "reminders"
  | "lock";

export type OrbSize = "small" | "medium" | "large";
export type GlowLevel = "low" | "medium" | "high";
export type ResponseStyle = "creative" | "balanced" | "precise";
export type ResponseLength = "short" | "medium" | "detailed";
export type AssistantLanguage = "en" | "hi" | "hi-en";
export type MemoryTag = "personal" | "project" | "note";
export type ActionStatus = "success" | "failed";
export type WeatherProviderId = "open-meteo" | "openweather";

export type OrbPrefs = {
  size: OrbSize;
  speed: number;
  glow: GlowLevel;
  particles: boolean;
  rays: boolean;
  rings: boolean;
  voiceReactive: boolean;
  battery: boolean;
};

export type VoicePrefs = {
  name: string;
  pace: number;
  language: AssistantLanguage;
  volume: number;
  interrupt: boolean;
  deviceFallback: boolean;
};

export type AiPrefs = {
  model: string;
  style: ResponseStyle;
  length: ResponseLength;
  streaming: boolean;
  grounding: boolean;
};

export type NotifyApp = {
  id: string;
  name: string;
  autoReply: boolean;
};

export type NotifyPrefs = {
  studyMode: boolean;
  quietStart: string;
  quietEnd: string;
  apps: NotifyApp[];
  template: string;
};

export type MemoryItem = {
  id: string;
  title: string;
  body: string;
  tag: MemoryTag;
  createdAt: number;
  updatedAt: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  source?: "gemini" | "weather" | "device";
  audioSource?: "gemini-tts" | "device-tts";
  pending?: boolean;
  error?: boolean;
};

export type ActionLog = {
  id: string;
  name: string;
  at: number;
  status: ActionStatus;
  detail?: string;
};

export type NoteItem = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

export type ReminderItem = {
  id: string;
  title: string;
  at: number;
  done: boolean;
};

export type DailyForecast = {
  date: string;
  maxC: number;
  minC: number;
  condition: string;
  rainProbability: number | null;
};

export type WeatherReport = {
  place: string;
  temperatureC: number;
  feelsLikeC: number | null;
  humidity: number | null;
  windKph: number | null;
  condition: string;
  rainProbability: number | null;
  daily: DailyForecast[];
  provider: WeatherProviderId;
  observedAt: string;
};

export type ServiceStatus = {
  configured: boolean;
  verifiedAt: number | null;
  hint: string | null;
  model?: string | null;
  provider?: WeatherProviderId | null;
};

export type CredentialStatus = {
  gemini: ServiceStatus;
  weather: ServiceStatus;
  seal: "env" | "builtin";
};
