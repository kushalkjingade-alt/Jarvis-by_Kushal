import type { WeatherReport } from "@/lib/types";

function num(value: number, digits = 0): string {
  return value.toFixed(digits);
}

export function formatWeatherReply(report: WeatherReport, rainQuestion: boolean): string {
  const temp = num(report.temperatureC);
  const lines: string[] = [];
  if (rainQuestion) {
    if (report.rainProbability === null) {
      lines.push(
        `I could not get a rain probability for ${report.place}. The current condition is ${report.condition.toLowerCase()} at ${temp}°C.`,
      );
    } else {
      lines.push(
        `${report.place}: the chance of rain today is ${Math.round(report.rainProbability)}%. It is ${temp}°C and ${report.condition.toLowerCase()} right now.`,
      );
    }
  } else {
    lines.push(`Current weather in ${report.place}: ${temp}°C, ${report.condition.toLowerCase()}.`);
  }
  const extras: string[] = [];
  if (report.feelsLikeC !== null) extras.push(`Feels like ${num(report.feelsLikeC)}°C`);
  if (report.humidity !== null) extras.push(`Humidity ${Math.round(report.humidity)}%`);
  if (report.windKph !== null) extras.push(`Wind ${num(report.windKph)} km/h`);
  if (!rainQuestion && report.rainProbability !== null) {
    extras.push(`Chance of rain today ${Math.round(report.rainProbability)}%`);
  }
  if (extras.length) lines.push(`${extras.join(". ")}.`);
  if (report.daily.length) {
    const days = report.daily.slice(0, 4).map((day) => {
      const rain = day.rainProbability === null ? "" : `, rain ${Math.round(day.rainProbability)}%`;
      return `${day.date}: ${num(day.minC)}–${num(day.maxC)}°C, ${day.condition.toLowerCase()}${rain}`;
    });
    lines.push(`Forecast: ${days.join("; ")}.`);
  }
  lines.push(`Source: ${report.provider === "open-meteo" ? "Open-Meteo" : "OpenWeather"}.`);
  return lines.join(" ");
}
