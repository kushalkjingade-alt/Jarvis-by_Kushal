/** Prebuilt studio voices documented for Gemini TTS. Not a generated list. */
export const GEMINI_VOICES = [
  { name: "Zephyr", trait: "Bright" },
  { name: "Puck", trait: "Upbeat" },
  { name: "Charon", trait: "Informative" },
  { name: "Kore", trait: "Firm" },
  { name: "Fenrir", trait: "Excitable" },
  { name: "Leda", trait: "Youthful" },
  { name: "Orus", trait: "Firm" },
  { name: "Aoede", trait: "Breezy" },
  { name: "Callirrhoe", trait: "Easy-going" },
  { name: "Autonoe", trait: "Bright" },
  { name: "Enceladus", trait: "Breathy" },
  { name: "Iapetus", trait: "Clear" },
  { name: "Umbriel", trait: "Easy-going" },
  { name: "Algieba", trait: "Smooth" },
  { name: "Despina", trait: "Smooth" },
  { name: "Erinome", trait: "Clear" },
  { name: "Algenib", trait: "Gravelly" },
  { name: "Rasalgethi", trait: "Informative" },
  { name: "Laomedeia", trait: "Upbeat" },
  { name: "Achernar", trait: "Soft" },
  { name: "Alnilam", trait: "Firm" },
  { name: "Schedar", trait: "Even" },
  { name: "Gacrux", trait: "Mature" },
  { name: "Pulcherrima", trait: "Forward" },
  { name: "Achird", trait: "Friendly" },
  { name: "Zubenelgenubi", trait: "Casual" },
  { name: "Vindemiatrix", trait: "Gentle" },
  { name: "Sadachbia", trait: "Lively" },
  { name: "Sadaltager", trait: "Knowledgeable" },
  { name: "Sulafat", trait: "Warm" },
] as const;

export type GeminiVoiceName = (typeof GEMINI_VOICES)[number]["name"];

export const DEFAULT_VOICE: GeminiVoiceName = "Kore";

export function isGeminiVoice(name: string): name is GeminiVoiceName {
  return GEMINI_VOICES.some((voice) => voice.name === name);
}

/** Gemini TTS has no numeric rate field. Pace is sent as a style instruction. */
export function paceStyle(pace: number): string {
  if (pace < 0.9) return "speaking slowly and clearly";
  if (pace > 1.25) return "speaking rapidly but still clearly";
  if (pace > 1.08) return "speaking a little faster than usual";
  return "speaking at a natural conversational pace";
}
