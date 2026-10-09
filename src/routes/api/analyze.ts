import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_TEXT_MODEL, isTextModel } from "@/lib/models";
import { analyzeImage, explainGeminiError } from "@/server/gemini.server";
import { readSession } from "@/server/session.server";

const PROMPTS: Record<string, string> = {
  explain:
    "Explain this image. If it shows code, explain what the code does. If it shows an equation, explain it step by step. Otherwise describe what is visible.",
  errors:
    "If this image contains code or writing, point out likely errors. If none are visible, say so. Do not invent text that is not readable.",
  summarize: "Summarize what is visible. Quote readable text. Mark anything unreadable instead of guessing.",
  ocr: "Extract the visible text. Keep line breaks where you can. Mark unreadable parts as [unreadable].",
};

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const session = await readSession();
        if (!session.data.geminiKey || !session.data.geminiVerifiedAt) {
          return Response.json({ error: "Gemini is not configured. Add a valid API key before analyzing images." }, { status: 401 });
        }
        const data = body && typeof body.data === "string" ? body.data : "";
        const mimeType = body && typeof body.mimeType === "string" ? body.mimeType : "";
        const task = body && typeof body.task === "string" ? body.task : "explain";
        if (!data || !mimeType.startsWith("image/")) {
          return Response.json({ error: "Attach a JPEG or PNG image first." }, { status: 400 });
        }
        if (data.length > 6_000_000) {
          return Response.json({ error: "That image is too large. Try a smaller photo." }, { status: 413 });
        }
        const model =
          session.data.geminiModel && isTextModel(session.data.geminiModel) ? session.data.geminiModel : DEFAULT_TEXT_MODEL;
        try {
          const text = await analyzeImage({
            apiKey: session.data.geminiKey,
            model,
            mimeType,
            data,
            prompt: PROMPTS[task] ?? PROMPTS.explain!,
            signal: request.signal,
          });
          return Response.json({ text }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({ error: explainGeminiError(error, session.data.geminiKey) }, { status: 502 });
        }
      },
    },
  },
});
