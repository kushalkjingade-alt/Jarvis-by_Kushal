import { createFileRoute } from "@tanstack/react-router";
import { formatWeatherReply } from "@/lib/format-weather";
import { DEFAULT_TEXT_MODEL, isTextModel } from "@/lib/models";
import type { AssistantLanguage, ResponseLength, ResponseStyle } from "@/lib/types";
import { parseWeatherAsk } from "@/lib/weather-intent";
import { explainGeminiError, streamGemini } from "@/server/gemini.server";
import { readSession } from "@/server/session.server";
import { loadWeather } from "@/server/weather.server";

function isStyle(value: unknown): value is ResponseStyle {
  return value === "creative" || value === "balanced" || value === "precise";
}
function isLength(value: unknown): value is ResponseLength {
  return value === "short" || value === "medium" || value === "detailed";
}
function isLanguage(value: unknown): value is AssistantLanguage {
  return value === "en" || value === "hi" || value === "hi-en";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 180_000) {
          return Response.json({ error: "That conversation is too large." }, { status: 413 });
        }
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "The chat request was not valid JSON." }, { status: 400 });
        }
        const session = await readSession();
        if (!session.data.geminiKey || !session.data.geminiVerifiedAt) {
          return Response.json(
            { error: "Gemini is not configured. Add a valid API key in API setup." },
            { status: 401 },
          );
        }
        const turns = Array.isArray(body.messages)
          ? body.messages.flatMap((item) => {
              if (!item || typeof item !== "object") return [];
              const role = "role" in item ? item.role : undefined;
              const text = "text" in item ? item.text : undefined;
              if ((role !== "user" && role !== "assistant") || typeof text !== "string") return [];
              return [{ role, text }];
            })
          : [];
        const lastUser = [...turns].reverse().find((turn) => turn.role === "user");
        if (!lastUser) return Response.json({ error: "Type a message first." }, { status: 400 });

        const weatherCity = typeof body.weatherCity === "string" ? body.weatherCity : "";
        const ask = parseWeatherAsk(lastUser.text, weatherCity);
        if (ask.match) {
          if (!session.data.weatherProvider || !session.data.weatherVerifiedAt) {
            return Response.json(
              { error: "Weather is not configured. Validate Open-Meteo or OpenWeather in API setup." },
              { status: 409 },
            );
          }
          if (!ask.city) {
            return new Response(
              "Tell me a city first, for example: what's the weather in Bengaluru? I will not guess the conditions.",
              { headers: { "content-type": "text/plain; charset=utf-8", "x-jarvis-source": "weather", "cache-control": "no-store" } },
            );
          }
          try {
            const report = await loadWeather({
              provider: session.data.weatherProvider,
              apiKey: session.data.weatherKey,
              city: ask.city,
            });
            return new Response(formatWeatherReply(report, ask.rain), {
              headers: {
                "content-type": "text/plain; charset=utf-8",
                "x-jarvis-source": "weather",
                "x-jarvis-place": encodeURIComponent(report.place),
                "cache-control": "no-store",
              },
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Weather data could not be retrieved.";
            return Response.json({ error: message }, { status: 502 });
          }
        }

        const requested = typeof body.model === "string" ? body.model : "";
        const model = isTextModel(requested)
          ? requested
          : session.data.geminiModel && isTextModel(session.data.geminiModel)
            ? session.data.geminiModel
            : DEFAULT_TEXT_MODEL;
        const memories = Array.isArray(body.memories)
          ? body.memories.flatMap((item) => {
              if (!item || typeof item !== "object") return [];
              const title = "title" in item && typeof item.title === "string" ? item.title.slice(0, 80) : "";
              const text = "body" in item && typeof item.body === "string" ? item.body.slice(0, 400) : "";
              if (!title || !text) return [];
              return [{ title, body: text }];
            })
          : [];
        const encoder = new TextEncoder();
        let started = false;
        const stream = new ReadableStream({
          async start(controller) {
            try {
              await streamGemini({
                apiKey: session.data.geminiKey!,
                model,
                turns,
                style: isStyle(body.style) ? body.style : "balanced",
                length: isLength(body.length) ? body.length : "medium",
                language: isLanguage(body.language) ? body.language : "en",
                displayName: typeof body.displayName === "string" ? body.displayName.slice(0, 40) : "",
                studyMode: body.studyMode === true,
                memories: memories.slice(0, 12),
                grounding: body.grounding === true,
                signal: request.signal,
                onText: (chunk) => {
                  started = true;
                  controller.enqueue(encoder.encode(chunk));
                },
              });
              if (!started) controller.enqueue(encoder.encode("Gemini returned an empty reply."));
              controller.close();
            } catch (error) {
              const message = explainGeminiError(error, session.data.geminiKey);
              if (!started) {
                controller.enqueue(encoder.encode(`[[JARVIS_ERROR]]${message}`));
              } else {
                controller.enqueue(encoder.encode(`\n\nGemini stopped: ${message}`));
              }
              controller.close();
            }
          },
        });
        return new Response(stream, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-jarvis-source": "gemini",
            "x-jarvis-model": model,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
