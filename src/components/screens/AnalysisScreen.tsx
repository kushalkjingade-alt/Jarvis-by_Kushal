import { useState } from "react";
import { useAssistant } from "@/components/app/assistant";
import { useNav } from "@/components/app/nav";
import { ErrorNote, GhostButton, PrimaryButton, ScreenHeader } from "@/components/ui";
import { analyzeImage } from "@/lib/client-api";
import { useJarvis } from "@/lib/store";

async function blobToJpeg(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!output) throw new Error("Could not prepare that image.");
  const bytes = new Uint8Array(await output.arrayBuffer());
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

export function AnalysisScreen() {
  const { back, go } = useNav();
  const { sendText } = useAssistant();
  const log = useJarvis((state) => state.logAction);
  const [consent, setConsent] = useState(false);
  const [data, setData] = useState("");
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [follow, setFollow] = useState("");

  const storeImage = async (blob: Blob) => {
    const encoded = await blobToJpeg(blob);
    setData(encoded);
    setPreview(`data:image/jpeg;base64,${encoded}`);
    setResult("");
    setError("");
  };

  const run = async (task: "explain" | "errors" | "summarize" | "ocr") => {
    if (!consent) {
      setError("Confirm that this image may be sent to Google Gemini before analyzing it.");
      return;
    }
    if (!data) {
      setError("Add a photo or screen capture first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const text = await analyzeImage({ data, mimeType: "image/jpeg", task });
      setResult(text);
      log("Screen analysis", "success", task);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      setError(message);
      log("Screen analysis", "failed", message.slice(0, 140));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full">
      <ScreenHeader title="Screen analysis" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <p className="text-sm text-muted">
          Images are sent to Gemini with your saved key for this request. JARVIS does not keep the photo on the server.
          Android may block secure screens. This does not bypass that.
        </p>
        <label className="flex items-start gap-2 text-sm text-fg">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
          I agree to send this image to Google Gemini for analysis.
        </label>
        <div className="flex flex-wrap gap-2">
          <GhostButton
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = () => {
                const file = input.files?.[0];
                if (file) void storeImage(file).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not read the file."));
              };
              input.click();
            }}
          >
            Upload image
          </GhostButton>
          <GhostButton
            onClick={() => {
              void navigator.mediaDevices
                .getUserMedia({ video: { facingMode: "environment" } })
                .then(async (stream) => {
                  const video = document.createElement("video");
                  video.srcObject = stream;
                  await video.play();
                  const canvas = document.createElement("canvas");
                  canvas.width = video.videoWidth || 640;
                  canvas.height = video.videoHeight || 480;
                  canvas.getContext("2d")?.drawImage(video, 0, 0);
                  stream.getTracks().forEach((track) => track.stop());
                  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
                  if (!blob) throw new Error("Camera capture failed.");
                  await storeImage(blob);
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "Camera permission was denied."));
            }}
          >
            Camera
          </GhostButton>
          <GhostButton
            onClick={() => {
              const media = navigator.mediaDevices?.getDisplayMedia;
              if (!media) {
                setError("This browser cannot share a screen. Upload a screenshot instead.");
                return;
              }
              void media
                .call(navigator.mediaDevices, { video: true })
                .then(async (stream) => {
                  const video = document.createElement("video");
                  video.srcObject = stream;
                  await video.play();
                  const canvas = document.createElement("canvas");
                  canvas.width = video.videoWidth || 640;
                  canvas.height = video.videoHeight || 480;
                  canvas.getContext("2d")?.drawImage(video, 0, 0);
                  stream.getTracks().forEach((track) => track.stop());
                  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
                  if (!blob) throw new Error("Screen capture failed.");
                  await storeImage(blob);
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "Screen share was cancelled."));
            }}
          >
            Share screen
          </GhostButton>
        </div>
        {preview ? <img src={preview} alt="Selected capture" className="max-h-56 w-full rounded-3xl border border-border object-contain" /> : null}
        <div className="flex flex-wrap gap-2">
          <PrimaryButton disabled={busy} onClick={() => void run("explain")}>Explain</PrimaryButton>
          <GhostButton disabled={busy} onClick={() => void run("errors")}>Find errors</GhostButton>
          <GhostButton disabled={busy} onClick={() => void run("summarize")}>Summarize</GhostButton>
          <GhostButton disabled={busy} onClick={() => void run("ocr")}>Read text</GhostButton>
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {result ? (
          <div className="rounded-3xl border border-border bg-surface p-4 text-sm text-fg">
            <p className="whitespace-pre-wrap">{result}</p>
            <label className="mt-3 block text-xs text-muted">
              Follow-up
              <textarea value={follow} onChange={(event) => setFollow(event.target.value)} className="mt-1 min-h-20 w-full rounded-2xl border border-border bg-bg px-3 py-2 text-sm text-fg" />
            </label>
            <PrimaryButton
              className="mt-3"
              disabled={!follow.trim()}
              onClick={() => {
                void sendText(`About this earlier image analysis:\n${result}\n\nQuestion: ${follow}`);
                go("chat");
              }}
            >
              Ask Gemini
            </PrimaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
