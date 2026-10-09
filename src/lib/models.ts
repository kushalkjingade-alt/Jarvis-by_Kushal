/** Text models supported by the Gemini API. */
export const TEXT_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Recommended default" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", note: "Previous-generation Flash" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", note: "Legacy Flash model" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", note: "Fast, cost-efficient replies" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", note: "Lightweight alternative" },
] as const;

export type TextModelId = (typeof TEXT_MODELS)[number]["id"];

export const DEFAULT_TEXT_MODEL: TextModelId = "gemini-3.8-flash";

export const TTS_MODEL = "gemini-3.8-flash-tts";
export const TTS_FALLBACK_MODEL = "gemini-3.8-flash-lite-tts";

export function isTextModel(id: string): id is TextModelId {
  return TEXT_MODELS.some((model) => model.id === id);
}
