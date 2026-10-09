import type { CredentialStatus, WeatherReport } from "@/lib/types";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // Response body was not JSON.
  }
  return `Request failed (${response.status}).`;
}

export async function fetchStatus(): Promise<CredentialStatus> {
  const response = await fetch("/api/credentials", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CredentialStatus;
}

export async function postCredentials(body: Record<string, unknown>): Promise<{
  ok: boolean;
  error?: string;
  status?: CredentialStatus;
  verifiedAt?: number;
}> {
  const response = await fetch("/api/credentials", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    ok?: boolean;
    error?: string;
    status?: CredentialStatus;
    verifiedAt?: number;
  };
  if (!response.ok || payload.ok === false) {
    return { ok: false, error: payload.error || `Request failed (${response.status}).` };
  }
  return { ok: true, status: payload.status, verifiedAt: payload.verifiedAt };
}

export async function fetchWeather(input: {
  city?: string;
  latitude?: number;
  longitude?: number;
}): Promise<WeatherReport> {
  const response = await fetch("/api/weather", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as WeatherReport;
}

export async function streamReply(
  body: Record<string, unknown>,
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<{ text: string; source: "gemini" | "weather"; model: string | null }> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const sourceHeader = response.headers.get("x-jarvis-source");
  const source = sourceHeader === "weather" ? "weather" : "gemini";
  if (!response.ok) throw new Error(await parseError(response));
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The assistant returned an empty stream.");
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    text += decoder.decode(step.value, { stream: true });
    if (text.startsWith("[[JARVIS_ERROR]]")) {
      throw new Error(text.replace("[[JARVIS_ERROR]]", ""));
    }
    onText(text);
  }
  text += decoder.decode();
  if (text.startsWith("[[JARVIS_ERROR]]")) throw new Error(text.replace("[[JARVIS_ERROR]]", ""));
  return { text, source, model: response.headers.get("x-jarvis-model") };
}

export async function analyzeImage(input: {
  data: string;
  mimeType: string;
  task: "explain" | "errors" | "summarize" | "ocr";
}): Promise<string> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const body = (await response.json()) as { text?: string };
  if (!body.text) throw new Error("Gemini returned an empty analysis.");
  return body.text;
}
