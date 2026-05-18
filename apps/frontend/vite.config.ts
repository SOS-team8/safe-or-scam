import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // /api/v1/images → ai-pipeline (StaticFiles)로 라우팅.
      // 일반 /api 보다 더 구체적인 경로를 먼저 선언해 ai-pipeline(8001)이 우선 매칭되도록 한다.
      '/api/v1/images': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/game-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
