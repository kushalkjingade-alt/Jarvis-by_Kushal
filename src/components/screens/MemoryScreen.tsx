import { useState } from "react";
import { useNav } from "@/components/app/nav";
import { Card, Field, GhostButton, PrimaryButton, ScreenHeader } from "@/components/ui";
import { useJarvis } from "@/lib/store";
import type { MemoryTag } from "@/lib/types";

export function MemoryScreen() {
  const { back, go } = useNav();
  const memories = useJarvis((state) => state.memories);
  const add = useJarvis((state) => state.addMemory);
  const update = useJarvis((state) => state.updateMemory);
  const remove = useJarvis((state) => state.deleteMemory);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<MemoryTag | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [nextTag, setNextTag] = useState<MemoryTag>("personal");
  const visible = memories.filter((item) => {
    const hay = `${item.title} ${item.body}`.toLowerCase();
    return (tag === "all" || item.tag === tag) && hay.includes(query.toLowerCase());
  });

  const reset = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setNextTag("personal");
  };

  return (
    <div className="min-h-full">
      <ScreenHeader title="Memory" onBack={back} />
      <div className="space-y-3 px-4 pb-6">
        <div className="flex gap-2">
          {(["all", "personal", "project", "note"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setTag(item)} className={tag === item ? "h-10 rounded-full bg-primary px-3 text-sm text-bg" : "h-10 rounded-full border border-border px-3 text-sm text-fg"}>
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memory…" className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none" />
        <button type="button" onClick={() => go("chat")} className="text-sm text-primary">
          Open chat history
        </button>
        {visible.map((item) => (
          <Card key={item.id}>
            <p className="text-xs uppercase text-primary">{item.tag}</p>
            <p className="mt-1 text-sm text-fg">{item.title}</p>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
            <div className="mt-3 flex gap-2">
              <GhostButton
                onClick={() => {
                  setEditing(item.id);
                  setTitle(item.title);
                  setBody(item.body);
                  setNextTag(item.tag);
                }}
              >
                Edit
              </GhostButton>
              <GhostButton onClick={() => remove(item.id)}>Delete</GhostButton>
            </div>
          </Card>
        ))}
        {visible.length === 0 ? <p className="text-sm text-muted">No saved memories yet. Only facts you add here are kept.</p> : null}
        <Card className="space-y-3">
          <h2 className="text-sm text-fg">{editing ? "Edit memory" : "Add memory"}</h2>
          <Field label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="block text-sm text-muted">
            Detail
            <textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-border bg-bg px-4 py-3 text-fg outline-none" />
          </label>
          <div className="flex gap-2">
            {(["personal", "project", "note"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setNextTag(item)} className={nextTag === item ? "h-10 rounded-full bg-primary px-3 text-sm text-bg" : "h-10 rounded-full border border-border px-3 text-sm"}>
                {item}
              </button>
            ))}
          </div>
          <PrimaryButton
            disabled={!title.trim() || !body.trim()}
            onClick={() => {
              if (editing) update(editing, { title: title.trim(), body: body.trim(), tag: nextTag });
              else add({ title: title.trim(), body: body.trim(), tag: nextTag });
              reset();
            }}
          >
            {editing ? "Save memory" : "Add memory"}
          </PrimaryButton>
        </Card>
      </div>
    </div>
  );
}
