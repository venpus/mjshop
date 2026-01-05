import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React와 React DOM을 별도 청크로 분리
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 큰 라이브러리들을 별도 청크로 분리
          'lucide-react': ['lucide-react'],
        },
      },
    },
    // 청크 크기 경고 임계값을 600KB로 증가 (현재 최대 청크가 약 1.2MB이므로)
    chunkSizeWarningLimit: 600,
  },
})
