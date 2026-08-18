import BrandLogo from './BrandLogo'

/**
 * What the server sends for routes that mount client-side.
 *
 * Those routes are the signed-in app, and they render from `localStorage`, so
 * they cannot be server-rendered without either leaking one visitor's state into
 * a cached response or flashing signed-out chrome at everyone. The previous
 * answer was to send nothing at all: the body was an empty `<div>` and the
 * browser had nothing to paint until the whole bundle had downloaded, parsed and
 * executed. First paint was pinned to JavaScript, which is why it was slow on a
 * phone and fine on a desktop.
 *
 * This is the part of the page that is the same for every visitor — the header
 * bar, at the height `Layout` gives it — so the browser can paint as soon as the
 * stylesheet arrives.
 *
 * It deliberately stops there. Everything it draws (the bar, its border, the
 * logo) stays in exactly the same place once the real UI mounts, and the rest of
 * the app fills the empty space below it. Content appearing in space that was
 * blank is not a layout shift; only content that moves something already painted
 * is. Guessing at nav links or a page skeleton would have meant guessing their
 * size too, and getting it wrong trades a paint-timing problem for a
 * layout-shift one.
 */
export default function AppRouteShell() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(135deg,_#f8fafc_0%,_#ffffff_45%,_rgba(224,242,254,0.6)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_26%),linear-gradient(135deg,_#020617_0%,_#020617_48%,_#0f172a_100%)]">
      <header className="relative z-50 border-b border-slate-200/70 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.03)] md:sticky md:top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-[72px] md:h-20 py-1">
            <span className="flex shrink-0 items-center py-1">
              <BrandLogo appName="ClearCaseIQ" size="xl" />
            </span>
          </div>
        </div>
      </header>
      <p role="status" className="sr-only">
        Loading
      </p>
    </div>
  )
}
