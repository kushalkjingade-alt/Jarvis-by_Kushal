import { formatWeatherReply } from "@/lib/format-weather";
import type { WeatherProviderId, WeatherReport } from "@/lib/types";
import { weatherLabel } from "@/lib/weather-codes";

type GeoHit = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 180) };
  }
}

function placeLabel(hit: GeoHit): string {
  return [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
}

export async function geocodeCity(city: string): Promise<GeoHit> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch {
    throw new Error("Could not reach the weather geocoder. Check the connection and retry.");
  }
  if (!response.ok) throw new Error(`City search failed (${response.status}).`);
  const body = (await readJson(response)) as { results?: GeoHit[] };
  const hit = body.results?.[0];
  if (!hit || typeof hit.latitude !== "number" || typeof hit.longitude !== "number") {
    throw new Error(`No matching city for “${city}”. Try a more specific name.`);
  }
  return hit;
}

export async function reversePlace(latitude: number, longitude: number): Promise<string> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("language", "en");
  try {
    const response = await fetch(url);
    if (!response.ok) return "Current location";
    const body = (await readJson(response)) as { results?: GeoHit[] } | GeoHit;
    const hit = "results" in body ? body.results?.[0] : body;
    if (hit && typeof hit === "object" && "name" in hit && hit.name) return placeLabel(hit);
  } catch {
    return "Current location";
  }
  return "Current location";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchOpenMeteo(latitude: number, longitude: number, place: string): Promise<WeatherReport> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
  );
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("wind_speed_unit", "kmh");
  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch {
    throw new Error("Could not reach Open-Meteo. Check the connection and retry.");
  }
  if (!response.ok) throw new Error(`Open-Meteo failed (${response.status}).`);
  const body = (await readJson(response)) as {
    current?: Record<string, unknown>;
    daily?: Record<string, unknown>;
  };
  const temperature = asNumber(body.current?.temperature_2m);
  const code = asNumber(body.current?.weather_code);
  if (temperature === null || code === null) {
    throw new Error("Open-Meteo did not return a current temperature.");
  }
  const dates = Array.isArray(body.daily?.time) ? (body.daily?.time as unknown[]) : [];
  const maxes = Array.isArray(body.daily?.temperature_2m_max) ? (body.daily?.temperature_2m_max as unknown[]) : [];
  const mins = Array.isArray(body.daily?.temperature_2m_min) ? (body.daily?.temperature_2m_min as unknown[]) : [];
  const codes = Array.isArray(body.daily?.weather_code) ? (body.daily?.weather_code as unknown[]) : [];
  const rains = Array.isArray(body.daily?.precipitation_probability_max)
    ? (body.daily?.precipitation_probability_max as unknown[])
    : [];
  const daily = dates.slice(0, 5).flatMap((date, index) => {
    const maxC = asNumber(maxes[index]);
    const minC = asNumber(mins[index]);
    const dayCode = asNumber(codes[index]);
    if (typeof date !== "string" || maxC === null || minC === null || dayCode === null) return [];
    return [
      {
        date,
        maxC,
        minC,
        condition: weatherLabel(dayCode),
        rainProbability: asNumber(rains[index]),
      },
    ];
  });
  return {
    place,
    temperatureC: temperature,
    feelsLikeC: asNumber(body.current?.apparent_temperature),
    humidity: asNumber(body.current?.relative_humidity_2m),
    windKph: asNumber(body.current?.wind_speed_10m),
    condition: weatherLabel(code),
    rainProbability: daily[0]?.rainProbability ?? null,
    daily,
    provider: "open-meteo",
    observedAt: new Date().toISOString(),
  };
}

export async function fetchOpenWeather(city: string, apiKey: string): Promise<WeatherReport> {
  const currentUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
  currentUrl.searchParams.set("q", city);
  currentUrl.searchParams.set("appid", apiKey);
  currentUrl.searchParams.set("units", "metric");
  let currentRes: Response;
  try {
    currentRes = await fetch(currentUrl);
  } catch {
    throw new Error("Could not reach OpenWeather. Check the connection and retry.");
  }
  const currentBody = (await readJson(currentRes)) as {
    name?: string;
    cod?: number | string;
    message?: string;
    main?: { temp?: number; feels_like?: number; humidity?: number };
    weather?: { description?: string }[];
    wind?: { speed?: number };
  };
  if (!currentRes.ok) {
    if (currentRes.status === 401) throw new Error("OpenWeather rejected this API key.");
    if (currentRes.status === 404) throw new Error(`OpenWeather found no city named “${city}”.`);
    throw new Error(currentBody.message || `OpenWeather failed (${currentRes.status}).`);
  }
  const temp = asNumber(currentBody.main?.temp);
  if (temp === null) throw new Error("OpenWeather did not return a temperature.");
  const forecastUrl = new URL("https://api.openweathermap.org/data/2.5/forecast");
  forecastUrl.searchParams.set("q", city);
  forecastUrl.searchParams.set("appid", apiKey);
  forecastUrl.searchParams.set("units", "metric");
  const daily: WeatherReport["daily"] = [];
  try {
    const forecastRes = await fetch(forecastUrl);
    if (forecastRes.ok) {
      const forecast = (await readJson(forecastRes)) as {
        list?: { dt_txt?: string; pop?: number; main?: { temp_min?: number; temp_max?: number }; weather?: { description?: string }[] }[];
      };
      const byDay = new Map<string, { min: number; max: number; pop: number; condition: string }>();
      for (const row of forecast.list ?? []) {
        const day = row.dt_txt?.slice(0, 10);
        const min = asNumber(row.main?.temp_min);
        const max = asNumber(row.main?.temp_max);
        if (!day || min === null || max === null) continue;
        const prev = byDay.get(day);
        const pop = asNumber(row.pop);
        byDay.set(day, {
          min: prev ? Math.min(prev.min, min) : min,
          max: prev ? Math.max(prev.max, max) : max,
          pop: Math.max(prev?.pop ?? 0, pop === null ? 0 : pop * 100),
          condition: row.weather?.[0]?.description ?? prev?.condition ?? "Unknown",
        });
      }
      for (const [date, value] of byDay) {
        if (daily.length >= 5) break;
        daily.push({
          date,
          minC: value.min,
          maxC: value.max,
          condition: value.condition,
          rainProbability: value.pop,
        });
      }
    }
  } catch {
    // Current conditions are still valid if the forecast call fails.
  }
  const wind = asNumber(currentBody.wind?.speed);
  return {
    place: currentBody.name || city,
    temperatureC: temp,
    feelsLikeC: asNumber(currentBody.main?.feels_like),
    humidity: asNumber(currentBody.main?.humidity),
    windKph: wind === null ? null : wind * 3.6,
    condition: currentBody.weather?.[0]?.description
      ? currentBody.weather[0].description.replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "Unknown",
    rainProbability: daily[0]?.rainProbability ?? null,
    daily,
    provider: "openweather",
    observedAt: new Date().toISOString(),
  };
}

export async function loadWeather(input: {
  provider: WeatherProviderId;
  apiKey?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}): Promise<WeatherReport> {
  if (input.provider === "openweather") {
    if (!input.apiKey) throw new Error("Add an OpenWeather API key before using that provider.");
    if (!input.city?.trim()) throw new Error("Enter a city for OpenWeather.");
    return fetchOpenWeather(input.city.trim(), input.apiKey);
  }
  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    const place = input.city?.trim() || (await reversePlace(input.latitude, input.longitude));
    return fetchOpenMeteo(input.latitude, input.longitude, place);
  }
  if (!input.city?.trim()) throw new Error("Enter a city, or use your current location.");
  const hit = await geocodeCity(input.city.trim());
  return fetchOpenMeteo(hit.latitude, hit.longitude, placeLabel(hit));
}

export async function validateWeather(input: {
  provider: WeatherProviderId;
  apiKey?: string;
}): Promise<WeatherReport> {
  if (input.provider === "openweather") {
    return loadWeather({ provider: "openweather", apiKey: input.apiKey, city: "Bengaluru" });
  }
  return loadWeather({ provider: "open-meteo", city: "Bengaluru" });
}

export { formatWeatherReply };
