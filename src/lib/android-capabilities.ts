export type Capability = {
  id: string;
  title: string;
  state: "works" | "partial" | "native";
  detail: string;
};

export const ANDROID_CAPABILITIES: Capability[] = [
  {
    id: "apps",
    title: "Open supported apps",
    state: "partial",
    detail:
      "This browser can open websites such as YouTube or WhatsApp Web. It cannot launch installed Android packages.",
  },
  {
    id: "search",
    title: "Search the app list",
    state: "partial",
    detail: "Search covers the curated launcher in this app, not every package installed on the phone.",
  },
  {
    id: "notes",
    title: "Notes",
    state: "works",
    detail: "Notes are saved in this browser and survive reloads on this device.",
  },
  {
    id: "reminders",
    title: "Reminders and timers",
    state: "partial",
    detail:
      "Timers fire while JARVIS BY KUSHAL is open. A closed-app alarm needs a native Android scheduler, which this web build does not include.",
  },
  {
    id: "settings",
    title: "Android system settings",
    state: "native",
    detail: "Opening Wi-Fi, Bluetooth, or system settings needs an Android intent. The browser cannot do that.",
  },
  {
    id: "screen",
    title: "Screen capture",
    state: "partial",
    detail:
      "You can share a screen or photo when the browser allows it. Android's secure layers still cannot be captured.",
  },
  {
    id: "notifications",
    title: "Notification access",
    state: "native",
    detail:
      "Reading WhatsApp, Telegram, or other apps' notifications needs Android Notification Listener access. This web build cannot see those notifications or send replies into those apps.",
  },
];
