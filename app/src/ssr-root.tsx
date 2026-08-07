import AppProviders from './AppProviders'

/**
 * Root used for routes we render on the server (SEO landing pages). Unlike
 * `next-root`, this is imported statically so Next can render it server-side;
 * the client hydrates the same tree.
 */
export default function SsrRoot({ location }: { location: string }) {
  return <AppProviders serverRendered location={location} />
}
