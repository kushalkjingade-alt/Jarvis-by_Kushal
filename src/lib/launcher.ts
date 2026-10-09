export type LaunchApp = {
  name: string;
  href?: string;
  blurb: string;
  packageName: string;
  mode: "browser" | "camera" | "native";
};

export const LAUNCH_APPS: LaunchApp[] = [
  {
    name: "YouTube",
    href: "https://www.youtube.com",
    blurb: "Opens YouTube in the browser",
    packageName: "com.google.android.youtube",
    mode: "browser",
  },
  {
    name: "Chrome",
    href: "https://www.google.com",
    blurb: "Opens Google search. Cannot switch the Android Chrome app.",
    packageName: "com.android.chrome",
    mode: "browser",
  },
  {
    name: "WhatsApp",
    href: "https://web.whatsapp.com",
    blurb: "Opens WhatsApp Web, not the installed chat app",
    packageName: "com.whatsapp",
    mode: "browser",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com",
    blurb: "Opens Instagram in the browser",
    packageName: "com.instagram.android",
    mode: "browser",
  },
  {
    name: "VS Code",
    href: "https://vscode.dev",
    blurb: "Opens the web editor",
    packageName: "com.microsoft.vscode",
    mode: "browser",
  },
  {
    name: "Play Store",
    href: "https://play.google.com/store",
    blurb: "Opens the Play Store website",
    packageName: "com.android.vending",
    mode: "browser",
  },
  {
    name: "Camera",
    blurb: "Uses this browser's camera for a photo you can analyze",
    packageName: "com.android.camera",
    mode: "camera",
  },
  {
    name: "Phone settings",
    blurb: "Needs a native Android intent",
    packageName: "com.android.settings",
    mode: "native",
  },
];
