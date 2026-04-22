/**
 * Abstract hero artwork — trust, clarity, legal context (no stock photo dependency).
 */
export default function MarketingHeroArt() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl opacity-[0.35] dark:opacity-[0.2]" aria-hidden>
      <svg
        className="absolute -right-8 -top-12 h-[420px] w-[420px] text-brand-200/50 dark:text-brand-800/40"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hero-a" x1="40" y1="0" x2="360" y2="400">
            <stop stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="hero-b" x1="200" y1="80" x2="320" y2="280">
            <stop stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="160" stroke="url(#hero-a)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="110" stroke="url(#hero-a)" strokeWidth="1" opacity="0.7" />
        <path
          d="M120 260 L200 120 L280 260 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="url(#hero-b)"
          className="text-accent-400/30"
        />
        <rect
          x="155"
          y="165"
          width="90"
          height="118"
          rx="6"
          stroke="currentColor"
          strokeWidth="1.2"
          className="text-brand-500/40"
          fill="currentColor"
          fillOpacity="0.06"
        />
        <path
          d="M155 178h62l23 23v92a6 6 0 01-6 6h-79a6 6 0 01-6-6v-109a6 6 0 016-6z"
          fill="white"
          fillOpacity="0.4"
        />
        <path d="M217 178v23h23" stroke="currentColor" strokeWidth="1" className="text-brand-600/35" />
        <path
          d="M172 228l14 14 32-38"
          stroke="#d97706"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
