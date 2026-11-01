import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        accent: v("accent"),
        "accent-ink": v("accent-ink"),
        "accent-soft": v("accent-soft"),
        sponsor: v("sponsor"),
        "sponsor-soft": v("sponsor-soft"),
        good: v("good"),
        warn: v("warn"),
        bad: v("bad"),
      },
      fontFamily: {
        display: ["'Geist Variable'", "Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        sans: ["'Geist Variable'", "Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["'Geist Mono Variable'", "'Geist Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: { card: "14px" },
      maxWidth: { page: "1120px" },
    },
  },
  plugins: [],
} satisfies Config;
