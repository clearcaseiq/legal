import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      // The real react-native source is Flow-typed and unparseable by the test
      // transformer; stub the small surface used at module load.
      'react-native': fileURLToPath(new URL('./src/test/react-native-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
