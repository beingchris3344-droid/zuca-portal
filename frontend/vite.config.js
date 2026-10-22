import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    viteCompression(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB safety net
      },
      devOptions: { enabled: false },
      manifest: {
        name: "ZucaPortal",
        short_name: "ZucaPortal",
        description: "ZucaPortal app - manage contributions and users easily",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://zuca-backend-iw9p.onrender.com',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['framer-motion'],
          'utils': ['axios'],
          'socket': ['socket.io-client'],
          'pdf': ['jspdf', 'html2canvas'],
          'docx': ['docx'],
          'ocr': ['tesseract.js'],
          'helmet': ['react-helmet-async'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})