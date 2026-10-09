import { Home, LayoutGrid, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ScreenId } from "@/lib/types";

const ITEMS: { id: ScreenId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "tools", label: "Tools", icon: LayoutGrid },
  { id: "settings", label: "Settings", icon: Settings },
];

export function BottomNav({ current, onNavigate }: { current: ScreenId; onNavigate: (screen: ScreenId) => void }) {
  return (
    <nav className="grid grid-cols-4 border-t border-border bg-bg px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      {ITEMS.map((item) => {
        const active = current === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={cn("flex h-14 flex-col items-center justify-center gap-1 text-xs", active ? "text-primary" : "text-muted")}
          >
            <Icon className="size-5" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
