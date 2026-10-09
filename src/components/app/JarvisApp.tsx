import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AssistantProvider } from "@/components/app/assistant";
import { NavContext, type SetupMode } from "@/components/app/nav";
import { BottomNav } from "@/components/shell/BottomNav";
import { StatusBar } from "@/components/shell/StatusBar";
import { AppsScreen } from "@/components/screens/AppsScreen";
import { AnalysisScreen } from "@/components/screens/AnalysisScreen";
import { ChatScreen } from "@/components/screens/ChatScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { MemoryScreen } from "@/components/screens/MemoryScreen";
import { NotificationsScreen } from "@/components/screens/NotificationsScreen";
import { OnboardingScreen } from "@/components/screens/OnboardingScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import {
  AiConfigScreen,
  AppearanceScreen,
  OrbSettingsScreen,
  PersonalizationScreen,
  VoiceSettingsScreen,
} from "@/components/screens/SettingsDetailScreens";
import { SetupScreen } from "@/components/screens/SetupScreen";
import { SplashScreen } from "@/components/screens/SplashScreen";
import { DeviceScreen, HistoryScreen, LockScreen, OfflineScreen, PrivacyScreen, SystemScreen } from "@/components/screens/SystemScreens";
import { ToolsScreen } from "@/components/screens/ToolsScreen";
import { NotesScreen, RemindersScreen, WeatherScreen } from "@/components/screens/UtilityScreens";
import { VoiceStage } from "@/components/screens/VoiceStage";
import { useJarvis } from "@/lib/store";
import type { ScreenId } from "@/lib/types";

const TABS = new Set<ScreenId>(["home", "chat", "tools", "settings"]);

function quietNow(start: string, end: string) {
  const toMins = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };
  const from = toMins(start);
  const to = toMins(end);
  if (from === null || to === null || from === to) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return from < to ? mins >= from && mins < to : mins >= from || mins < to;
}

function ScreenBody({ screen }: { screen: ScreenId }) {
  switch (screen) {
    case "splash":
      return <SplashScreen />;
    case "onboarding":
      return <OnboardingScreen />;
    case "setup":
      return <SetupScreen />;
    case "home":
      return <HomeScreen />;
    case "listening":
      return <VoiceStage mode="listening" />;
    case "processing":
      return <VoiceStage mode="processing" />;
    case "speaking":
      return <VoiceStage mode="speaking" />;
    case "chat":
      return <ChatScreen />;
    case "tools":
      return <ToolsScreen />;
    case "apps":
      return <AppsScreen />;
    case "memory":
      return <MemoryScreen />;
    case "analysis":
      return <AnalysisScreen />;
    case "notifications":
      return <NotificationsScreen />;
    case "settings":
      return <SettingsScreen />;
    case "orb-settings":
      return <OrbSettingsScreen />;
    case "voice-settings":
      return <VoiceSettingsScreen />;
    case "ai-config":
      return <AiConfigScreen />;
    case "privacy":
      return <PrivacyScreen />;
    case "system":
      return <SystemScreen />;
    case "offline":
      return <OfflineScreen />;
    case "history":
      return <HistoryScreen />;
    case "weather":
      return <WeatherScreen />;
    case "appearance":
      return <AppearanceScreen />;
    case "personalization":
      return <PersonalizationScreen />;
    case "device":
      return <DeviceScreen />;
    case "notes":
      return <NotesScreen />;
    case "reminders":
      return <RemindersScreen />;
    case "lock":
      return <LockScreen />;
    default:
      return <HomeScreen />;
  }
}

export function JarvisApp() {
  const [stack, setStack] = useState<ScreenId[]>(["splash"]);
  const [setupMode, setSetupMode] = useState<SetupMode>("first");
  const screen = stack[stack.length - 1] ?? "splash";
  const textScale = useJarvis((state) => state.textScale);
  const reducePref = useJarvis((state) => state.reduceMotion);
  const reduceSystem = useReducedMotion();
  const reduce = reducePref || Boolean(reduceSystem);

  const go = useCallback((next: ScreenId) => {
    setStack((current) => [...current, next]);
  }, []);
  const back = useCallback(() => {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);
  const replace = useCallback((next: ScreenId) => {
    setStack([next]);
  }, []);
  const tab = useCallback((next: ScreenId) => {
    setStack([next]);
  }, []);
  const openSetup = useCallback((mode: SetupMode) => {
    setSetupMode(mode);
    setStack((current) => (mode === "first" ? ["setup"] : [...current, "setup"]));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = useJarvis.getState();
      const due = state.reminders.filter((item) => !item.done && item.at <= Date.now());
      for (const item of due) {
        state.completeReminder(item.id);
        state.logAction("Reminder", "success", item.title);
        const quiet = quietNow(state.notify.quietStart, state.notify.quietEnd);
        if (!state.notify.studyMode && !quiet && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("JARVIS BY KUSHAL", { body: item.title });
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const scaleClass = textScale === "lg" ? "text-lg" : textScale === "sm" ? "text-sm" : "text-base";

  return (
    <NavContext.Provider value={{ screen, go, back, replace, tab, openSetup, setupMode }}>
      <AssistantProvider navigate={go}>
        <div className={`mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-bg text-fg md:border-x md:border-border ${scaleClass}`}>
          <StatusBar />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              className="min-h-0 flex-1 overflow-y-auto no-scrollbar"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ScreenBody screen={screen} />
            </motion.div>
          </AnimatePresence>
          {TABS.has(screen) ? <BottomNav current={screen} onNavigate={tab} /> : null}
        </div>
      </AssistantProvider>
    </NavContext.Provider>
  );
}
