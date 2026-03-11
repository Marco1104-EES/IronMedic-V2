import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest', // 🟢 關鍵升級：切換為自訂 Service Worker 模式
      srcDir: 'src',                // 🟢 SW 檔案所在目錄
      filename: 'sw.js',            // 🟢 SW 檔案名稱
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: '醫護鐵人賽事系統',
        short_name: '醫護鐵人',
        description: '醫護鐵人賽事管理與報名系統',
        theme_color: '#ffffff',
        background_color: '#ffffff', // 啟動畫面的背景色
        display: 'standalone',       // 隱藏瀏覽器網址列，全螢幕執行
        orientation: 'portrait',     // 鎖定直向
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
            purpose: 'any maskable' // 讓 Android 手機可以自動裁切圓角圖示
          }
        ]
      }
      // 🟢 移除了原有的 workbox 區塊，因為在 injectManifest 模式下將由 sw.js 全權接管離線防禦
    })
  ],
})