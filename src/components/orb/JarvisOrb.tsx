import { useEffect, useRef, useState } from "react";
import type { OrbMode, OrbLive } from "@/components/orb/orb-scene";
import { cn } from "@/lib/cn";

export function JarvisOrb({ live, className }: { live: OrbLive; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef(live);
  liveRef.current = live;
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cleanup: () => void = () => undefined;
    let cancel = false;
    void import("@/components/orb/orb-scene")
      .then((mod) => {
        if (cancel) return;
        try {
          cleanup = mod.mountOrb(canvas, () => liveRef.current);
        } catch {
          setWebgl(false);
        }
      })
      .catch(() => setWebgl(false));
    return () => {
      cancel = true;
      cleanup();
    };
  }, []);

  return (
    <div className={cn("relative mx-auto aspect-square w-64", className)} aria-hidden>
      <div
        className={cn(
          "absolute inset-8 rounded-full glow-amber",
          live.mode === "sleep" ? "opacity-30" : "opacity-80",
          live.mode === "error" && "opacity-90",
        )}
        style={{ background: "radial-gradient(circle, var(--color-primary), transparent 68%)" }}
      />
      {webgl ? <canvas ref={canvasRef} className="relative z-10 size-full" /> : null}
    </div>
  );
}

export type { OrbMode };
