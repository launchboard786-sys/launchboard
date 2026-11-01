import Link from "next/link";
import { Crown } from "@/components/Crown";

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="text-sponsor opacity-60"><Crown size={40} /></span>
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">This throne is empty</h1>
      <p className="text-muted">The page you&apos;re looking for doesn&apos;t exist, or the listing was removed.</p>
      <Link href="/" className="btn-primary mt-2 rounded-full px-6 py-3">Back to home</Link>
    </div>
  );
}
