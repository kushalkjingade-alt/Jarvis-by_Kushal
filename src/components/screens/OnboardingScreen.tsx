import { useState } from "react";
import { Bell, Mic, Smartphone, Sparkles } from "lucide-react";
import { useNav } from "@/components/app/nav";
import { PrimaryButton } from "@/components/ui";
import { useJarvis } from "@/lib/store";

const SLIDES = [
  {
    icon: Mic,
    title: "Talk. Get answers.",
    body: "Speak or type. Gemini answers through the server, using the key you save during setup.",
  },
  {
    icon: Smartphone,
    title: "Control what this browser can.",
    body: "Notes, reminders, and web links work here. Launching installed Android apps needs a native build.",
  },
  {
    icon: Bell,
    title: "Stay in charge.",
    body: "Weather comes from a real forecast. Screen photos are sent to Gemini only after you agree.",
  },
  {
    icon: Sparkles,
    title: "And the orb.",
    body: "The orb follows idle, listening, thinking, and speaking. It is not a random light show.",
  },
];

export function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const { openSetup } = useNav();
  const setOnboarded = useJarvis((state) => state.setOnboarded);
  const slide = SLIDES[index] ?? SLIDES[0]!;
  const Icon = slide.icon;
  const last = index === SLIDES.length - 1;

  return (
    <div className="flex min-h-full flex-col px-6 py-8">
      <p className="text-center text-sm text-muted">Welcome to</p>
      <h1 className="mt-1 text-center font-display text-2xl text-primary">JARVIS BY KUSHAL</h1>
      <p className="text-center text-sm text-muted">Your personal AI assistant</p>
      <div className="mt-10 flex flex-1 flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-full border border-border text-primary">
          <Icon className="size-7" />
        </div>
        <h2 className="mt-6 font-display text-lg text-fg">{slide.title}</h2>
        <p className="mt-3 max-w-xs text-sm text-muted">{slide.body}</p>
      </div>
      <div className="mb-6 flex justify-center gap-2">
        {SLIDES.map((item, dot) => (
          <span key={item.title} className={dot === index ? "h-2 w-6 rounded-full bg-primary" : "size-2 rounded-full bg-border"} />
        ))}
      </div>
      <PrimaryButton
        className="w-full"
        onClick={() => {
          if (!last) {
            setIndex((value) => value + 1);
            return;
          }
          setOnboarded(true);
          openSetup("first");
        }}
      >
        {last ? "Get started" : "Next"}
      </PrimaryButton>
    </div>
  );
}
