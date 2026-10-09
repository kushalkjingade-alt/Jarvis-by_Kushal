const WEATHER_RE = /\b(weather|temperature|forecast|humidity|humid|wind|rain|raining|umbrella)\b/i;

export function parseWeatherAsk(
  text: string,
  fallbackCity: string,
): { match: true; city: string; rain: boolean } | { match: false } {
  if (!WEATHER_RE.test(text)) return { match: false };
  const rain = /\b(rain|raining|umbrella|precip)\b/i.test(text);
  const match = text.match(/\b(?:in|for|at)\s+([A-Za-z][A-Za-z .'-]{1,48})/i);
  let city = match?.[1]?.replace(/\b(today|tomorrow|tonight|now|please|right now)\b/gi, "") ?? "";
  city = city.replace(/[?.!,]+$/g, "").trim();
  if (!city) city = fallbackCity.trim();
  return { match: true, city, rain };
}
