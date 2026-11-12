import { defineConfig } from 'vite'

const abs = (file: string) => decodeURIComponent(new URL(file, import.meta.url).pathname)

export default defineConfig({
  root: abs('.'),
  server: { host: '127.0.0.1', port: 5173, open: true },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    rollupOptions: { input: { host: abs('./index.html'), frame: abs('./frame.html') } },
  },
})
