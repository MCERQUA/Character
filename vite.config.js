import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  assetsInclude: ['**/*.glb'],
  build: {
    assetsInlineLimit: 0 // Ensure GLB files are not inlined
  }
})
