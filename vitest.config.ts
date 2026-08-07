import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reuse the app's Vite config (notably the `@` -> ./src alias and the React
// plugin) so tests resolve imports exactly the way the app does, then layer the
// test-only settings on top.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // jsdom gives the utility modules a `window`/`localStorage`/DOM surface
      // without pulling in a real browser.
      environment: 'jsdom',
      globals: true,
      include: ['src/__tests__/**/*.test.{ts,tsx}'],
    },
  }),
)
