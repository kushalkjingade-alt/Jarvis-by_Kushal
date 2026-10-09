import { createContext, useContext } from "react";
import type { ScreenId } from "@/lib/types";

export type SetupMode = "first" | "manage";

type NavValue = {
  screen: ScreenId;
  go: (screen: ScreenId) => void;
  back: () => void;
  replace: (screen: ScreenId) => void;
  tab: (screen: ScreenId) => void;
  openSetup: (mode: SetupMode) => void;
  setupMode: SetupMode;
};

export const NavContext = createContext<NavValue | null>(null);

export function useNav() {
  const value = useContext(NavContext);
  if (!value) throw new Error("Navigation is unavailable.");
  return value;
}
