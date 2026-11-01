"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

async function upload(file: File, kind: "logo" | "screenshot"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" isn't an image.`);
  if (file.size > MAX_BYTES) throw new Error(`"${file.name}" is larger than 8 MB.`);
  const fd = new FormData();
  fd.append("kind", kind);
  fd.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) throw new Error(data.error?.message ?? "Upload failed. Please try again.");
  return data.url;
}

function Spinner({ light = false }: { light?: boolean }) {
  return <span className={`h-5 w-5 animate-spin rounded-full border-2 ${light ? "border-white/30 border-t-white" : "border-ink/20 border-t-ink"}`} />;
}
function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" />
    </svg>
  );
}

/** Lets a drop zone accept files dragged from the desktop. */
function useDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); },
    },
  };
}

export function LogoPicker({ value, onChange, onBusy }: { value: string; onChange: (url: string) => void; onBusy: (b: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(files: File[]) {
    const f = files[0];
    if (!f) return;
    setErr(null); setBusy(true); onBusy(true);
    try { onChange(await upload(f, "logo")); } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); onBusy(false); if (input.current) input.current.value = ""; }
  }
  const drop = useDrop(pick);

  return (
    <div>
      <span className="label" id="logo-label">Logo <span className="font-normal text-muted">(optional)</span></span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          {...drop.props}
          onClick={() => input.current?.click()}
          aria-label={value ? "Replace logo" : "Upload logo"}
          className={`relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] border bg-surface text-muted transition-colors ${drop.over ? "border-accent bg-accent-soft" : value ? "border-line" : "border-dashed border-ink/25 hover:border-ink/50"}`}
        >
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon />}
          {busy && <span className="absolute inset-0 grid place-items-center bg-black/45"><Spinner light /></span>}
        </button>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost px-3.5 py-1.5" onClick={() => input.current?.click()} disabled={busy} aria-describedby="logo-help">
              {busy ? "Uploading…" : value ? "Replace" : "Upload logo"}
            </button>
            {value && !busy && <button type="button" className="btn-ghost px-3.5 py-1.5 text-muted" onClick={() => onChange("")}>Remove</button>}
          </div>
          <p id="logo-help" className="text-xs text-muted">Square PNG or JPG, at least 64×64. We crop it to a square.</p>
        </div>
      </div>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-labelledby="logo-label" data-testid="logo-input" onChange={(e) => pick([...(e.target.files ?? [])])} />
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
    </div>
  );
}

export function ScreenshotPicker({ value, onChange, onBusy, max = 6 }: { value: string[]; onChange: (urls: string[]) => void; onBusy: (b: boolean) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const latest = useRef(value);
  latest.current = value;

  async function pick(files: File[]) {
    const room = max - latest.current.length;
    const take = files.slice(0, Math.max(0, room));
    if (!take.length) { setErr(`You can add up to ${max} screenshots.`); return; }
    setErr(files.length > take.length ? `Only ${max} screenshots fit, so ${files.length - take.length} were skipped.` : null);
    setPending(take.length); onBusy(true);
    for (const f of take) {
      try {
        const url = await upload(f, "screenshot");
        latest.current = [...latest.current, url];
        onChange(latest.current);
      } catch (e) {
        setErr((e as Error).message);
      }
      setPending((n) => n - 1);
    }
    onBusy(false);
    if (input.current) input.current.value = "";
  }
  const drop = useDrop(pick);
  const move = (i: number) => { const n = [...value]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; onChange(n); };
  const full = value.length + pending >= max;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="label mb-0" id="shots-label">Screenshots <span className="font-normal text-muted">(optional, {value.length}/{max})</span></span>
        {value.length > 1 && <span className="text-xs text-muted">The first one is the cover</span>}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url, i) => (
          <li key={url} className="group relative aspect-video overflow-hidden rounded-[12px] border border-line bg-raised">
            <img src={url} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
            <div className="absolute right-1.5 top-1.5 flex gap-1.5">
              {i > 0 && (
                <button type="button" onClick={() => move(i)} aria-label={`Move screenshot ${i + 1} earlier`} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80">
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
              <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} aria-label={`Remove screenshot ${i + 1}`} className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80">
                <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            {i === 0 && value.length > 1 && <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">Cover</span>}
          </li>
        ))}
        {Array.from({ length: pending }, (_, i) => (
          <li key={`p${i}`} className="grid aspect-video place-items-center rounded-[12px] border border-line bg-raised"><Spinner /></li>
        ))}
        {!full && (
          <li>
            <button
              type="button"
              {...drop.props}
              onClick={() => input.current?.click()}
              className={`flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed text-sm text-muted transition-colors ${drop.over ? "border-accent bg-accent-soft text-ink" : "border-ink/25 hover:border-ink/50 hover:text-ink"}`}
            >
              <ImageIcon />
              <span className="font-medium">Add screenshots</span>
            </button>
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-muted">Show your product in action. PNG or JPG, up to 8 MB each. Drag and drop works too.</p>
      <input ref={input} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-labelledby="shots-label" data-testid="shots-input" onChange={(e) => pick([...(e.target.files ?? [])])} />
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
    </div>
  );
}
