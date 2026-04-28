# Web App Runtime

The web app is currently deployed and run through Next.js:

- `pnpm --filter caseiq-web dev`
- `pnpm --filter caseiq-web build`
- `pnpm --filter caseiq-web start`

`pages/[[...slug]].tsx` hosts the React SPA with SSR disabled. The Vite entrypoint and `vite.config.ts` are retained for local bundle experiments and migration work, but Next is the supported runtime until the Vite path is explicitly promoted.

Both runtimes mount the app through `src/AppProviders.tsx` so routing, language, theme, and toast providers stay in one place.

API request debug logging is off by default. To enable it in a local browser session, run:

```js
localStorage.setItem('caseiq:debugApi', 'true')
```

Remove the key to disable request logging again.
