/** Large page title that rises in word by word (CSS animation, visible without JavaScript). */
export function PageHeader({ kicker, title, description, children, size = "lg" }: { kicker?: React.ReactNode; title: string; description?: React.ReactNode; children?: React.ReactNode; size?: "lg" | "md" }) {
  const words = title.split(" ");
  return (
    <header className="flex flex-col gap-4">
      {kicker && <div className="rise kicker">{kicker}</div>}
      <h1 className={`${size === "lg" ? "text-[clamp(2.4rem,6vw,4.4rem)]" : "text-[clamp(2rem,4.5vw,3rem)]"} font-semibold leading-[1] tracking-[-0.045em]`}>
        <span className="sr-only">{title}</span>
        <span aria-hidden className="flex flex-wrap gap-x-[0.24em]">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em]">
              <span className="word-in inline-block" style={{ animationDelay: `${0.04 + i * 0.055}s` }}>{w}</span>
            </span>
          ))}
        </span>
      </h1>
      {description && <div className="rise max-w-2xl text-lg text-muted" style={{ animationDelay: "0.25s" }}>{description}</div>}
      {children && <div className="rise" style={{ animationDelay: "0.35s" }}>{children}</div>}
    </header>
  );
}
