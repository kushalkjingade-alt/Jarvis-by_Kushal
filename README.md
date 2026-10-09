# JARVIS BY KUSHAL

Mobile-first AI assistant. Gemini is the language model. Weather comes from Open-Meteo (no key) or OpenWeather (optional key).

## Run

```bash
npm run dev
```

The app serves the preview on port 8080.

## Keys

Users paste their own Gemini key, and an optional OpenWeather key, in the first-launch setup. The server checks each key with a live request before saving it.

Saved keys are sealed in an httpOnly cookie. They are not written to `localStorage`, the JavaScript bundle, or this repository.

Set `JARVIS_SESSION_SECRET` (32+ characters) in the server environment to seal that cookie with your own secret. See `.env.example`. If it is missing, the app uses a built-in development seal and says so on the setup screen. That is not a hardware vault.

## What is stored on the device

Chat, memories, notes, reminders, and preferences use browser storage so they survive reloads on this device. They are not put in a shared database, because this deployment has no per-user accounts and a shared database would be readable by every visitor.

There is no SQLite file. The host does not provide durable server disk for personal data.

## Voice

Speech recognition uses the browser. Replies are spoken with Gemini TTS (`gemini-3.8-flash-tts`, then `gemini-3.8-flash-lite-tts` if the first model is unavailable) and the documented prebuilt studio voices.

Gemini Live (a long-lived audio socket) is not proxied. Putting the API key in the page would expose it, and this host does not keep a bidirectional audio socket open. If Gemini TTS fails, device text-to-speech can play the same words and is labeled as device audio.

## Weather

Questions such as “what’s the weather in Bengaluru?” are answered from the weather provider, not invented by the model. If the lookup fails, the app shows the error.

## Android

The browser cannot launch installed Android apps, read other apps’ notifications, or schedule alarms after the page closes. Those limits are written on Device Control.

An APK still needs a machine with Android Studio:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npx cap open android
```

Point Capacitor at the production web build, then build the APK from Android Studio. Native plugins would still be required for notification access and package launching.

## Deploy

`npm run build` produces the hosted app. Do not commit real API keys.
