import { useState } from "react";
import { useNav } from "@/components/app/nav";
import { Card, ErrorNote, Field, GhostButton, PrimaryButton, ScreenHeader } from "@/components/ui";
import { fetchWeather } from "@/lib/client-api";
import { useJarvis } from "@/lib/store";

export function WeatherScreen() {
  const { back } = useNav();
  const city = useJarvis((state) => state.weatherCity);
  const setCity = useJarvis((state) => state.setWeatherCity);
  const report = useJarvis((state) => state.lastWeather);
  const setReport = useJarvis((state) => state.setLastWeather);
  const log = useJarvis((state) => state.logAction);
  const [draft, setDraft] = useState(city);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [askLocation, setAskLocation] = useState(false);

  const load = async (input: { city?: string; latitude?: number; longitude?: number }) => {
    setBusy(true);
    setError("");
    try {
      const next = await fetchWeather(input);
      setReport(next);
      if (input.city) setCity(input.city);
      else if (!next.place.toLowerCase().includes("current location")) setCity(next.place.split(",")[0] ?? "");
      log("Weather lookup", "success", next.place.split(",")[0]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Weather could not be loaded.";
      setError(message);
      log("Weather lookup", "failed", message.slice(0, 140));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full">
      <ScreenHeader title="Weather" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <Field label="City" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Bengaluru" />
        <div className="flex flex-wrap gap-2">
          <PrimaryButton disabled={busy || !draft.trim()} onClick={() => void load({ city: draft.trim() })}>
            {busy ? "Loading…" : "Get weather"}
          </PrimaryButton>
          <GhostButton onClick={() => setAskLocation(true)}>Use current location</GhostButton>
          {report ? <GhostButton disabled={busy} onClick={() => void load({ city: draft.trim() || report.place })}>Refresh</GhostButton> : null}
        </div>
        {askLocation ? (
          <Card>
            <p className="text-sm text-fg">Location is requested only because you tapped this. Coordinates go to the weather provider for this lookup and are not written into action history.</p>
            <div className="mt-3 flex gap-2">
              <PrimaryButton
                onClick={() => {
                  setAskLocation(false);
                  if (!navigator.geolocation) {
                    setError("This browser cannot share location. Type a city instead.");
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      void load({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                    },
                    () => setError("Location permission was denied. Type a city instead."),
                    { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
                  );
                }}
              >
                Allow once
              </PrimaryButton>
              <GhostButton onClick={() => setAskLocation(false)}>Cancel</GhostButton>
            </div>
          </Card>
        ) : null}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {report ? (
          <>
            <Card>
              <p className="text-xs text-primary">{report.provider === "open-meteo" ? "Open-Meteo" : "OpenWeather"}</p>
              <h2 className="mt-1 font-display text-lg text-fg">{report.place}</h2>
              <p className="mt-2 font-display text-4xl text-primary">{Math.round(report.temperatureC)}°C</p>
              <p className="text-sm text-fg">{report.condition}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted">
                <p>Feels like {report.feelsLikeC === null ? "—" : `${Math.round(report.feelsLikeC)}°C`}</p>
                <p>Humidity {report.humidity === null ? "—" : `${Math.round(report.humidity)}%`}</p>
                <p>Wind {report.windKph === null ? "—" : `${Math.round(report.windKph)} km/h`}</p>
                <p>Rain today {report.rainProbability === null ? "—" : `${Math.round(report.rainProbability)}%`}</p>
              </div>
              <p className="mt-2 text-xs text-muted">Checked {new Date(report.observedAt).toLocaleString()}</p>
            </Card>
            <Card className="space-y-2">
              <h2 className="text-sm text-fg">Forecast</h2>
              {report.daily.map((day) => (
                <div key={day.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{day.date}</span>
                  <span className="text-fg">
                    {Math.round(day.minC)}–{Math.round(day.maxC)}°C · {day.condition}
                    {day.rainProbability === null ? "" : ` · ${Math.round(day.rainProbability)}%`}
                  </span>
                </div>
              ))}
            </Card>
          </>
        ) : (
          <p className="text-sm text-muted">No weather loaded yet. Nothing here is estimated.</p>
        )}
      </div>
    </div>
  );
}

export function NotesScreen() {
  const { back } = useNav();
  const notes = useJarvis((state) => state.notes);
  const save = useJarvis((state) => state.saveNote);
  const remove = useJarvis((state) => state.deleteNote);
  const [id, setId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="min-h-full">
      <ScreenHeader title="Notes" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => {
              setId(note.id);
              setTitle(note.title);
              setBody(note.body);
            }}
            className="block w-full rounded-3xl border border-border bg-surface px-4 py-3 text-left"
          >
            <p className="text-sm text-fg">{note.title}</p>
            <p className="line-clamp-2 text-xs text-muted">{note.body}</p>
          </button>
        ))}
        <Field label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label className="block text-sm text-muted">
          Note
          <textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-28 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-fg" />
        </label>
        <div className="flex gap-2">
          <PrimaryButton
            disabled={!title.trim()}
            onClick={() => {
              save({ id, title: title.trim(), body: body.trim() });
              setId(undefined);
              setTitle("");
              setBody("");
            }}
          >
            Save note
          </PrimaryButton>
          {id ? (
            <GhostButton
              onClick={() => {
                remove(id);
                setId(undefined);
                setTitle("");
                setBody("");
              }}
            >
              Delete
            </GhostButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RemindersScreen() {
  const { back } = useNav();
  const reminders = useJarvis((state) => state.reminders);
  const add = useJarvis((state) => state.addReminder);
  const remove = useJarvis((state) => state.deleteReminder);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState(5);
  return (
    <div className="min-h-full">
      <ScreenHeader title="Reminders and timers" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <p className="text-sm text-muted">These fire only while JARVIS BY KUSHAL stays open. A closed-app alarm needs Android, which this web build does not include.</p>
        {reminders
          .slice()
          .sort((a, b) => a.at - b.at)
          .map((item) => (
            <Card key={item.id}>
              <p className={item.done ? "text-sm text-muted line-through" : "text-sm text-fg"}>{item.title}</p>
              <p className="text-xs text-muted">{new Date(item.at).toLocaleString()}</p>
              <GhostButton className="mt-2" onClick={() => remove(item.id)}>
                Delete
              </GhostButton>
            </Card>
          ))}
        <Field label="Reminder" value={title} onChange={(event) => setTitle(event.target.value)} />
        <label className="block text-sm text-muted">
          When
          <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-border bg-bg px-3 text-fg" />
        </label>
        <PrimaryButton
          disabled={!title.trim() || !when}
          onClick={() => {
            const at = new Date(when).getTime();
            if (Number.isNaN(at)) return;
            add(title.trim(), at);
            setTitle("");
          }}
        >
          Save reminder
        </PrimaryButton>
        <Card>
          <h2 className="text-sm text-fg">Timer</h2>
          <label className="mt-2 block text-sm text-muted">
            Minutes
            <input type="number" min={1} max={180} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="mt-1 h-12 w-full rounded-2xl border border-border bg-bg px-3 text-fg" />
          </label>
          <PrimaryButton
            className="mt-3"
            onClick={() => add(`Timer · ${minutes} min`, Date.now() + minutes * 60 * 1000)}
          >
            Start timer
          </PrimaryButton>
        </Card>
      </div>
    </div>
  );
}
