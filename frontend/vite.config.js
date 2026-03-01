import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression(),
    VitePWA({
      registerType: 'autoUpdate', // auto-updates the service worker
      manifest: {
        name: "ZucaPortal",
        short_name: "ZucaPortal",
        description: "ZucaPortal app - manage contributions and users easily",
        theme_color: "#4F46E5",
        background_color: "#ffffff",
        display: "standalone",  // opens like a real app
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
})