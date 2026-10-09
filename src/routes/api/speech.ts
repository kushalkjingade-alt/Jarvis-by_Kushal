import { createFileRoute } from "@tanstack/react-router";
import type { AssistantLanguage } from "@/lib/types";
import { explainGeminiError, synthesizeSpeech } from "@/server/gemini.server";
import { readSession } from "@/server/session.server";

export const Route = createFileRoute("/api/speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const session = await readSession();
        if (!session.data.geminiKey || !session.data.geminiVerifiedAt) {
          return Response.json({ error: "Gemini is not configured, so Gemini voices cannot play." }, { status: 401 });
        }
        const text = body && typeof body.text === "string" ? body.text.trim() : "";
        const voice = body && typeof body.voice === "string" ? body.voice : "";
        const pace = body && typeof body.pace === "number" ? body.pace : 1;
        const language: AssistantLanguage =
          body?.language === "hi" || body?.language === "hi-en" || body?.language === "en" ? body.language : "en";
        if (!text) return Response.json({ error: "There is no text to speak." }, { status: 400 });
        try {
          const audio = await synthesizeSpeech({
            apiKey: session.data.geminiKey,
            voice,
            pace: Math.min(1.6, Math.max(0.7, pace)),
            language,
            text,
          });
          const copy = new Uint8Array(audio.bytes);
          return new Response(new Blob([copy.buffer], { type: "audio/wav" }), {
            headers: {
              "content-type": audio.mime.startsWith("audio/") ? audio.mime : "audio/wav",
              "x-jarvis-audio": "gemini-tts",
              "x-jarvis-tts-model": audio.model,
              "cache-control": "no-store",
            },
          });
        } catch (error) {
          return Response.json(
            { error: explainGeminiError(error, session.data.geminiKey) },
            { status: 502, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
