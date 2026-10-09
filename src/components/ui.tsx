import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 px-4 pt-3 pb-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-primary"
          aria-label="Back"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <span className="size-11 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-sm tracking-wide text-fg">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-bg disabled:opacity-40",
        className,
      )}
    />
  );
}

export function GhostButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm text-fg disabled:opacity-40",
        className,
      )}
    />
  );
}

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <input
        {...props}
        className="mt-1 h-12 w-full rounded-2xl border border-border bg-bg px-4 text-fg outline-none focus:border-primary"
      />
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl border border-border bg-surface p-4", className)}>{children}</section>;
}

export function StatusPill({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-fg">
      <span className={cn("size-2 rounded-full", ok ? "bg-accent" : ok === false ? "bg-danger" : "bg-muted")} />
      {label}
    </span>
  );
}

export function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">{label}</p>
        {detail ? <p className="text-xs text-muted">{detail}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("h-8 w-14 rounded-full p-1", checked ? "bg-primary" : "bg-surface-2")}
      >
        <span className={cn("block size-6 rounded-full bg-fg transition-transform", checked && "translate-x-6")} />
      </button>
    </div>
  );
}

export function SliderRow({
  label,
  min,
  max,
  step,
  value,
  suffix,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block py-2 text-sm text-fg">
      <span className="flex justify-between">
        {label}
        <span className="text-primary">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="mt-2 h-11 w-full accent-primary"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Choice({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "h-10 rounded-full px-3 text-sm",
            value === option.id ? "bg-primary text-bg" : "border border-border text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}
