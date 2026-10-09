import { GoogleGenAI } from "@google/genai";
import { isTextModel, TTS_FALLBACK_MODEL, TTS_MODEL } from "@/lib/models";
import { isGeminiVoice, paceStyle } from "@/lib/voices";
import type { AssistantLanguage, ResponseLength, ResponseStyle } from "@/lib/types";
import { scrub } from "@/server/session.server";

export function explainGeminiError(error: unknown, key?: string): string {
  const status =
    typeof error === "object" && error && "status" in error ? Number((error as { status: unknown }).status) : 0;
  const message = error instanceof Error ? error.message : "Gemini request failed.";
  const lower = message.toLowerCase();
  if (status === 429 || lower.includes("resource_exhausted") || lower.includes("rate limit")) {
    return "Gemini rate limit reached. Wait a moment, then retry.";
  }
  if (status === 404 || lower.includes("not found") || lower.includes("not supported") || lower.includes("unknown model")) {
    return "That Gemini model is not available for this API key. Choose another model and validate again.";
  }
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    lower.includes("api key") ||
    lower.includes("api_key") ||
    lower.includes("permission")
  ) {
    return "Gemini rejected this API key. Check the key in Google AI Studio, then save and validate again.";
  }
  if (status === 503 || status === 500 || lower.includes("unavailable")) {
    return "Gemini is temporarily unavailable. Retry in a moment.";
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("timeout")) {
    return "Could not reach Gemini. Check the connection and retry.";
  }
  const clean = scrub(message, key);
  return clean || "Gemini request failed.";
}

export async function testGemini(apiKey: string, model: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTextModel(model)) {
    return { ok: false, error: "That model is not in the supported list for this app." };
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: "Reply with exactly the word PONG.",
      config: { maxOutputTokens: 32, temperature: 0 },
    });
    const text = response.text?.trim() ?? "";
    if (!text) {
      return {
        ok: false,
        error: `Gemini returned an empty reply for ${model}. This key may not have access to that model.`,
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: explainGeminiError(error, apiKey) };
  }
}

type ChatTurn = { role: "user" | "assistant"; text: string };

function lengthTokens(length: ResponseLength): number {
  if (length === "short") return 280;
  if (length === "detailed") return 1400;
  return 700;
}

function temperatureFor(style: ResponseStyle): number {
  if (style === "creative") return 0.9;
  if (style === "precise") return 0.2;
  return 0.6;
}

function languageLine(language: AssistantLanguage): string {
  if (language === "hi") return "Reply in Hindi.";
  if (language === "hi-en") return "Reply in a natural mix of Hindi and English.";
  return "Reply in English.";
}

export function buildSystemInstruction(input: {
  displayName: string;
  style: ResponseStyle;
  language: AssistantLanguage;
  studyMode: boolean;
  memories: { title: string; body: string }[];
}): string {
  const name = input.displayName.trim();
  const memoryBlock = input.memories
    .slice(0, 12)
    .map((item) => `- ${item.title}: ${item.body}`)
    .join("\n");
  return [
    "You are JARVIS BY KUSHAL, a personal AI assistant.",
    "Be clear, useful, and appropriate for a general audience including teenagers.",
    "Do not invent live weather, news, or device state. If you were not given a fact, say you do not know.",
    languageLine(input.language),
    input.style === "precise"
      ? "Prefer short, exact answers."
      : input.style === "creative"
        ? "You may be a little more vivid, but stay accurate."
        : "Use a balanced, conversational tone.",
    name ? `The user's name is ${name}.` : "",
    input.studyMode ? "Study mode is on. Prefer focused explanations and avoid distraction." : "",
    memoryBlock ? `User-approved memories:\n${memoryBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function streamGemini(input: {
  apiKey: string;
  model: string;
  turns: ChatTurn[];
  style: ResponseStyle;
  length: ResponseLength;
  language: AssistantLanguage;
  displayName: string;
  studyMode: boolean;
  memories: { title: string; body: string }[];
  grounding: boolean;
  signal: AbortSignal;
  onText: (chunk: string) => void;
}): Promise<void> {
  if (!isTextModel(input.model)) {
    throw new Error("That model is not in the supported list for this app.");
  }
  const contents = input.turns
    .filter((turn) => turn.text.trim())
    .slice(-16)
    .map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text.slice(0, 8000) }],
    }));
  if (!contents.length || contents[0]?.role !== "user") {
    throw new Error("A conversation has to start with a user message.");
  }
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await ai.models.generateContentStream({
    model: input.model,
    contents,
    config: {
      systemInstruction: buildSystemInstruction(input),
      maxOutputTokens: lengthTokens(input.length),
      temperature: temperatureFor(input.style),
      abortSignal: input.signal,
      tools: input.grounding ? [{ googleSearch: {} }] : undefined,
    },
  });
  for await (const chunk of response) {
    const text = chunk.text ?? "";
    if (text) input.onText(text);
  }
}

export async function analyzeImage(input: {
  apiKey: string;
  model: string;
  mimeType: string;
  data: string;
  prompt: string;
  signal: AbortSignal;
}): Promise<string> {
  if (!isTextModel(input.model)) {
    throw new Error("That model is not in the supported list for this app.");
  }
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await ai.models.generateContent({
    model: input.model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: input.mimeType, data: input.data } },
          { text: input.prompt },
        ],
      },
    ],
    config: {
      maxOutputTokens: 1200,
      temperature: 0.3,
      abortSignal: input.signal,
      systemInstruction:
        "Describe only what is visible. Do not invent unreadable text, code, or equations. If something is unclear, say so.",
    },
  });
  const text = response.text?.trim() ?? "";
  if (!text) throw new Error("Gemini returned an empty analysis.");
  return text;
}

export async function synthesizeSpeech(input: {
  apiKey: string;
  voice: string;
  pace: number;
  language: AssistantLanguage;
  text: string;
}): Promise<{ bytes: Uint8Array; model: string; mime: string }> {
  if (!isGeminiVoice(input.voice)) {
    throw new Error("That voice is not one of the documented Gemini prebuilt studio voices.");
  }
  const language = input.language === "hi" ? "hi" : "en";
  const errors: string[] = [];
  for (const model of [TTS_MODEL, TTS_FALLBACK_MODEL]) {
    try {
      const audio = await requestTts({ ...input, model, language });
      return audio;
    } catch (error) {
      errors.push(`${model}: ${explainGeminiError(error, input.apiKey)}`);
    }
  }
  throw new Error(errors.join(" "));
}

async function requestTts(input: {
  apiKey: string;
  model: string;
  voice: string;
  pace: number;
  language: string;
  text: string;
}): Promise<{ bytes: Uint8Array; model: string; mime: string }> {
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const interaction = await ai.interactions.create({
    model: input.model,
    store: false,
    input: [
      {
        type: "user_input",
        content: [
          {
            type: "text",
            text: input.text.slice(0, 4000),
            annotations: [{ type: "speech_metadata", style: paceStyle(input.pace) }],
          },
        ],
      },
    ],
    response_format: { type: "audio", mime_type: "audio/wav" },
    generation_config: {
      speech_config: [{ voice: input.voice, language: input.language }],
    },
  });
  const data = interaction.output_audio?.data;
  if (!data) {
    throw new Error("Gemini TTS returned no audio.");
  }
  const bytes = Uint8Array.from(Buffer.from(data, "base64"));
  if (!bytes.byteLength) throw new Error("Gemini TTS returned empty audio.");
  return { bytes, model: input.model, mime: interaction.output_audio?.mime_type || "audio/wav" };
}
