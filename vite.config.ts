import { defineConfig } from 'vite'

// Renderer build: everything is bundled into dist/ so the packaged app
// needs no node_modules at runtime (asar stays small and clean).
export default defineConfig({
  root: 'src',
  base: './', // relative asset paths — required when Electron loads dist/index.html via file://
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'chrome126',
    sourcemap: false,
    chunkSizeWarningLimit: 1500
  }
})
