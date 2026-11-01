import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap flex max-w-md flex-col items-center gap-3 pt-24 text-center">
      <p className="font-display text-6xl font-semibold tracking-tight text-accent">404</p>
      <h1 className="font-display text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="text-muted">The listing may have been removed or the link is wrong.</p>
      <Link href="/" className="btn-primary">Back to home</Link>
    </div>
  );
}
