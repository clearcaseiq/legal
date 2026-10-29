import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Suites that sign tokens directly would otherwise all need an MFA step;
    // auth.mfa.test.ts turns enforcement on for itself.
    env: { MFA_REQUIRED_ROLES: '' },
    include: ['src/**/*.test.ts'],
    /** Large `buildApp()` imports keep memory predictable in CI and on Windows. */
    fileParallelism: false,
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
