import { useCallback, useEffect, useRef, useState } from "react";
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
import { setIncomingContent } from "@/lib/incoming-content";

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
  const [incomingReady, setIncomingReady] = useState(false);
  const incomingOpened = useRef(false);
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
    let active = true;
    const MAX_BYTES = 1024 * 1024;
    const acceptFile = async (file: File) => {
      if (!active || !/\.(txt|md|json)$/i.test(file.name) || file.size > MAX_BYTES) return;
      try {
        const body = await file.text();
        if (!active || body.length > MAX_BYTES) return;
        incomingOpened.current = false;
        setIncomingContent({ title: file.name.replace(/\.(txt|md|json)$/i, "").slice(0, 120) || "Imported note", body });
        setIncomingReady(true);
      } catch { /* Invalid or unreadable incoming files are ignored safely. */ }
    };
    const url = new URL(window.location.href);
    const title = url.searchParams.get("title");
    const sharedText = url.searchParams.get("text");
    const sharedUrl = url.searchParams.get("url");
    if (title !== null || sharedText !== null || sharedUrl !== null) {
      const body = [sharedText, sharedUrl].filter(Boolean).join("\n");
      if (body.length <= MAX_BYTES) {
        incomingOpened.current = false;
        setIncomingContent({ title: (title || "Shared content").trim().slice(0, 120) || "Shared content", body });
        setIncomingReady(true);
      }
      url.searchParams.delete("title");
      url.searchParams.delete("text");
      url.searchParams.delete("url");
    }
    if (url.searchParams.get("source") === "file-handler") {
      url.searchParams.delete("source");
    }
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    const queue = (window as Window & { launchQueue?: { setConsumer: (consumer: (params: { files?: Array<{ getFile: () => Promise<File> }> }) => void) => void } }).launchQueue;
    queue?.setConsumer((params) => {
      const handle = params.files?.[0];
      if (handle) void handle.getFile().then(acceptFile).catch(() => {});
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!incomingReady || incomingOpened.current) return;

    if (screen === "notes") {
      incomingOpened.current = true;
      setIncomingReady(false);
      return;
    }

    if (screen !== "home") return;

    incomingOpened.current = true;
    setIncomingReady(false);
    go("notes");
  }, [screen, incomingReady, go]);

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
