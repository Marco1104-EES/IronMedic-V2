import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: '醫護鐵人賽事系統',
        short_name: '醫護鐵人',
        description: '醫護鐵人賽事管理與報名系統',
        theme_color: '#ffffff',
        background_color: '#ffffff', // 🟢 新增：啟動畫面的背景色 (讓體驗更像 App)
        display: 'standalone',       // 🟢 關鍵：隱藏瀏覽器網址列，全螢幕執行 (偽裝成原生 App 的核心)
        orientation: 'portrait',     // 🟢 建議：鎖定直向 (避免轉來轉去版面跑掉)
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // 🟢 新增：讓 Android 手機可以自動裁切圓角圖示
          }
        ]
      },
      // 🟢 新增：離線防禦機制 (Workbox)
      // 這會把您的 JS, CSS, HTML, 圖片快取到手機裡
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // 避免快取過大檔案，這裡設定上限 (例如 5MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
})