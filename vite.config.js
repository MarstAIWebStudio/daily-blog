import { defineConfig } from 'vite'

export default defineConfig({
  base: '/daily-blog/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
