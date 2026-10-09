import { getRequestProtocol, useSession } from "@tanstack/react-start/server";
import type { WeatherProviderId } from "@/lib/types";

export type CredSession = {
  geminiKey?: string;
  geminiModel?: string;
  geminiVerifiedAt?: number;
  weatherProvider?: WeatherProviderId;
  weatherKey?: string;
  weatherVerifiedAt?: number;
};

const DEV_SEAL = "jarvis-by-kushal-preview-seal-not-a-production-vault-v1";

export function sealMode(): "env" | "builtin" {
  const secret = process.env.JARVIS_SESSION_SECRET;
  return secret && secret.length >= 32 ? "env" : "builtin";
}

function sessionConfig() {
  const secret = process.env.JARVIS_SESSION_SECRET;
  const password = secret && secret.length >= 32 ? secret : DEV_SEAL;
  return {
    password,
    name: "jarvis_cred",
    maxAge: 60 * 60 * 24 * 180,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: getRequestProtocol() === "https",
    },
  };
}

export async function readSession() {
  return useSession<CredSession>(sessionConfig());
}

export function keyHint(key: string | undefined): string | null {
  if (!key) return null;
  return `••••${key.slice(-4)}`;
}

export function scrub(message: string, key?: string): string {
  let text = message;
  if (key && key.length > 6) text = text.split(key).join("[key]");
  return text.slice(0, 500);
}
