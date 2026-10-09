import { useEffect, useState } from "react";
import { JarvisOrb } from "@/components/orb/JarvisOrb";
import { useNav } from "@/components/app/nav";
import { fetchStatus } from "@/lib/client-api";
import { useJarvis } from "@/lib/store";
import type { OrbLive } from "@/components/orb/orb-scene";

const live: OrbLive = {
  mode: "idle",
  size: "medium",
  speed: 40,
  glow: "medium",
  particles: true,
  rays: true,
  rings: true,
  voiceReactive: false,
  battery: false,
  reduceMotion: false,
};

export function SplashScreen() {
  const { replace } = useNav();
  const [statusText, setStatusText] = useState("Initializing your AI assistant…");

  useEffect(() => {
    let cancel = false;
    const started = Date.now();
    void (async () => {
      await useJarvis.persist.rehydrate();
      let next: "onboarding" | "setup" | "lock" | "home" = "setup";
      try {
        const status = await fetchStatus();
        const state = useJarvis.getState();
        if (!state.onboarded) next = "onboarding";
        else if (!status.gemini.configured || !status.weather.configured) next = "setup";
        else if (state.pinHash || state.webauthnId) next = "lock";
        else next = "home";
      } catch {
        setStatusText("The assistant server did not respond. Setup will stay open.");
        next = useJarvis.getState().onboarded ? "setup" : "onboarding";
      }
      const wait = Math.max(0, 1100 - (Date.now() - started));
      await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (!cancel) replace(next);
    })();
    return () => {
      cancel = true;
    };
  }, [replace]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 text-center">
      <p className="font-display text-xs tracking-widest text-primary">J.A.R.V.I.S</p>
      <h1 className="mt-2 font-display text-3xl text-fg">SPARK</h1>
      <p className="mt-2 text-sm text-muted">Your personal AI assistant</p>
      <JarvisOrb live={live} className="my-6 w-56" />
      <p className="text-sm text-muted">{statusText}</p>
      <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
