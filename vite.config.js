import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  assetsInclude: ['**/*.glb'],
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['babylonjs', 'babylonjs-loaders'],
          pep: ['pepjs']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['babylonjs', 'babylonjs-loaders', 'pepjs']
  }
})
