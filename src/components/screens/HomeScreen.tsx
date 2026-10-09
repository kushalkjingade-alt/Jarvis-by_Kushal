import { Mic, Moon, SunMedium } from "lucide-react";
import { useAssistant } from "@/components/app/assistant";
import { useNav } from "@/components/app/nav";
import { JarvisOrb } from "@/components/orb/JarvisOrb";
import { useJarvis } from "@/lib/store";
import type { OrbMode } from "@/components/orb/orb-scene";

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name.trim() ? `${part}, ${name.trim()}.` : `${part}.`;
}

export function HomeScreen() {
  const { go } = useNav();
  const { beginListen, error } = useAssistant();
  const orb = useJarvis((state) => state.orb);
  const sleeping = useJarvis((state) => state.sleeping);
  const setSleeping = useJarvis((state) => state.setSleeping);
  const name = useJarvis((state) => state.displayName);
  const reduceMotion = useJarvis((state) => state.reduceMotion);
  const study = useJarvis((state) => state.notify.studyMode);
  const weather = useJarvis((state) => state.lastWeather);
  const mode: OrbMode = sleeping ? "sleep" : "idle";

  return (
    <div className="flex min-h-full flex-col px-4 pb-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="font-display text-xs tracking-widest text-primary">JARVIS BY KUSHAL</p>
          <p className="flex items-center gap-2 text-xs text-accent">
            <span className="size-2 rounded-full bg-accent" />
            {sleeping ? "Sleeping" : "Ready when you are"}
          </p>
        </div>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full border border-border text-primary"
          aria-label={sleeping ? "Wake assistant" : "Sleep orb"}
          onClick={() => setSleeping(!sleeping)}
        >
          {sleeping ? <SunMedium className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>
      <JarvisOrb
        className="mt-4"
        live={{ ...orb, mode, reduceMotion, particles: orb.particles, rays: orb.rays }}
      />
      <div className="mt-2 text-center">
        <h1 className="font-display text-lg text-fg">{greeting(name)}</h1>
        <p className="text-sm text-muted">How can I help you today?</p>
        {study ? <p className="mt-1 text-xs text-primary">Study mode is on.</p> : null}
      </div>
      {weather ? (
        <button type="button" onClick={() => go("weather")} className="mx-auto mt-4 max-w-full rounded-full border border-border px-4 py-2 text-sm text-fg">
          {weather.place.split(",")[0]} · {Math.round(weather.temperatureC)}°C · {weather.condition}
        </button>
      ) : null}
      {error ? <p className="mt-3 text-center text-sm text-danger">{error}</p> : null}
      <div className="mt-auto flex flex-col items-center gap-3 pt-6">
        <button
          type="button"
          onClick={() => {
            if (sleeping) setSleeping(false);
            beginListen();
          }}
          className="grid size-20 place-items-center rounded-full border border-primary bg-surface text-primary glow-amber"
          aria-label="Start listening"
        >
          <Mic className="size-7" />
        </button>
        <button type="button" onClick={() => go("chat")} className="h-12 w-full rounded-full border border-border text-sm text-muted">
          Tap to speak or type…
        </button>
      </div>
    </div>
  );
}
