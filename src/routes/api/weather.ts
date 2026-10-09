import { createFileRoute } from "@tanstack/react-router";
import { readSession } from "@/server/session.server";
import { loadWeather } from "@/server/weather.server";

export const Route = createFileRoute("/api/weather")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const session = await readSession();
        if (!session.data.weatherProvider || !session.data.weatherVerifiedAt) {
          return Response.json(
            { error: "Weather is not configured. Validate a provider in API setup." },
            { status: 409, headers: { "cache-control": "no-store" } },
          );
        }
        const city = body && typeof body.city === "string" ? body.city : "";
        const latitude = body && typeof body.latitude === "number" ? body.latitude : undefined;
        const longitude = body && typeof body.longitude === "number" ? body.longitude : undefined;
        try {
          const report = await loadWeather({
            provider: session.data.weatherProvider,
            apiKey: session.data.weatherKey,
            city,
            latitude,
            longitude,
          });
          return Response.json(report, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Weather data could not be retrieved.";
          return Response.json({ error: message }, { status: 502, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
