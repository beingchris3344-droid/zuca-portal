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
      // Use generateSW strategy instead of injectManifest
      strategies: 'generateSW',
      workbox: {
        // Increase file size limit to 5MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Don't try to cache huge files
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude large asset files from precaching
        globIgnores: ['**/assets/*-DE4zo69Q.js'], // Your large bundle
        // Runtime caching for API calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache'
            }
          }
        ]
      },
      manifest: {
        name: "ZucaPortal",
        short_name: "ZucaPortal",
        description: "ZucaPortal app - manage contributions and users easily",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['framer-motion'],
          'utils': ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})