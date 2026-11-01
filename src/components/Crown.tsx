/** REIGN mark: a three-peak crown built from the same bars as a leaderboard. */
export function Crown({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M3 18.5 4.6 7.2l4.6 4.6L12 4.5l2.8 7.3 4.6-4.6L21 18.5z" fill="currentColor" />
      <rect x="3" y="19.8" width="18" height="2.2" rx="1.1" fill="currentColor" opacity=".55" />
    </svg>
  );
}
