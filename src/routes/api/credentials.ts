import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_TEXT_MODEL, isTextModel } from "@/lib/models";
import type { CredentialStatus, WeatherProviderId } from "@/lib/types";
import { testGemini } from "@/server/gemini.server";
import { keyHint, readSession, sealMode } from "@/server/session.server";
import { validateWeather } from "@/server/weather.server";

function statusFrom(data: {
  geminiKey?: string;
  geminiModel?: string;
  geminiVerifiedAt?: number;
  weatherProvider?: WeatherProviderId;
  weatherKey?: string;
  weatherVerifiedAt?: number;
}): CredentialStatus {
  return {
    gemini: {
      configured: Boolean(data.geminiKey && data.geminiVerifiedAt),
      verifiedAt: data.geminiVerifiedAt ?? null,
      hint: keyHint(data.geminiKey),
      model: data.geminiModel ?? null,
    },
    weather: {
      configured: Boolean(data.weatherVerifiedAt && data.weatherProvider),
      verifiedAt: data.weatherVerifiedAt ?? null,
      hint: keyHint(data.weatherKey),
      provider: data.weatherProvider ?? null,
    },
    seal: sealMode(),
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/credentials")({
  server: {
    handlers: {
      GET: async () => {
        const session = await readSession();
        return json(statusFrom(session.data));
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body || typeof body.action !== "string") return json({ ok: false, error: "Missing action." }, 400);
        const session = await readSession();

        if (body.action === "save-gemini") {
          const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
          const model = typeof body.model === "string" ? body.model : DEFAULT_TEXT_MODEL;
          if (!apiKey) return json({ ok: false, error: "Enter a Gemini API key." }, 400);
          if (!isTextModel(model)) return json({ ok: false, error: "Choose a supported Gemini model." }, 400);
          const result = await testGemini(apiKey, model);
          if (!result.ok) return json({ ok: false, error: result.error }, 400);
          const verifiedAt = Date.now();
          await session.update((old) => ({ ...old, geminiKey: apiKey, geminiModel: model, geminiVerifiedAt: verifiedAt }));
          return json({ ok: true, status: statusFrom({ ...session.data, geminiKey: apiKey, geminiModel: model, geminiVerifiedAt: verifiedAt }) });
        }

        if (body.action === "save-weather") {
          const provider = body.provider === "openweather" ? "openweather" : body.provider === "open-meteo" ? "open-meteo" : null;
          if (!provider) return json({ ok: false, error: "Choose a weather provider." }, 400);
          const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
          if (provider === "openweather" && !apiKey) {
            return json({ ok: false, error: "Enter an OpenWeather API key, or switch to Open-Meteo." }, 400);
          }
          try {
            await validateWeather({ provider, apiKey });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Weather validation failed.";
            return json({ ok: false, error: message }, 400);
          }
          const verifiedAt = Date.now();
          await session.update((old) => ({
            ...old,
            weatherProvider: provider,
            weatherKey: provider === "openweather" ? apiKey : undefined,
            weatherVerifiedAt: verifiedAt,
          }));
          return json({
            ok: true,
            status: statusFrom({
              ...session.data,
              weatherProvider: provider,
              weatherKey: provider === "openweather" ? apiKey : undefined,
              weatherVerifiedAt: verifiedAt,
            }),
          });
        }

        if (body.action === "test") {
          if (body.service === "gemini") {
            if (!session.data.geminiKey) return json({ ok: false, error: "No Gemini key is saved on this browser." }, 400);
            const model = session.data.geminiModel && isTextModel(session.data.geminiModel) ? session.data.geminiModel : DEFAULT_TEXT_MODEL;
            const result = await testGemini(session.data.geminiKey, model);
            if (!result.ok) return json({ ok: false, error: result.error }, 400);
            const verifiedAt = Date.now();
            await session.update((old) => ({ ...old, geminiVerifiedAt: verifiedAt, geminiModel: model }));
            return json({ ok: true, verifiedAt });
          }
          if (body.service === "weather") {
            if (!session.data.weatherProvider || !session.data.weatherVerifiedAt) {
              return json({ ok: false, error: "Weather has not been validated yet." }, 400);
            }
            try {
              await validateWeather({ provider: session.data.weatherProvider, apiKey: session.data.weatherKey });
            } catch (error) {
              const message = error instanceof Error ? error.message : "Weather test failed.";
              return json({ ok: false, error: message }, 400);
            }
            const verifiedAt = Date.now();
            await session.update((old) => ({ ...old, weatherVerifiedAt: verifiedAt }));
            return json({ ok: true, verifiedAt });
          }
          return json({ ok: false, error: "Unknown service." }, 400);
        }

        if (body.action === "clear") {
          const service = body.service;
          const next =
            service === "gemini"
              ? { ...session.data, geminiKey: undefined, geminiModel: undefined, geminiVerifiedAt: undefined }
              : service === "weather"
                ? { ...session.data, weatherProvider: undefined, weatherKey: undefined, weatherVerifiedAt: undefined }
                : {};
          await session.update(() => next);
          return json({ ok: true, status: statusFrom(next) });
        }

        return json({ ok: false, error: "Unknown action." }, 400);
      },
    },
  },
});
