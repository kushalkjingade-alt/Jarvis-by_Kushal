import { useEffect, useState } from "react";
import { BatteryMedium, Wifi } from "lucide-react";

export function StatusBar() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      setLabel(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    };
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center justify-between px-5 pt-[max(0.75rem,env(safe-area-inset-top))] text-xs text-muted">
      <span className="tabular-nums">{label}</span>
      <span className="flex items-center gap-2">
        <Wifi className="size-3.5" />
        <BatteryMedium className="size-4" />
      </span>
    </div>
  );
}
