import { precacheAndRoute } from 'workbox-precaching'

// 🟢 1. 自動快取 Vite 編譯出來的靜態資源 (保留原本的離線能力與網頁更新提示)
precacheAndRoute(self.__WB_MANIFEST)

// 🟢 2. 核心靈魂：監聽「背景離線推播」事件
self.addEventListener('push', (event) => {
  console.log('📦 收到背景離線推播訊號！');
  
  let data = {};
  try {
    if (event.data) {
      data = event.data.json(); // 嘗試解析 JSON 格式的推播內容
    }
  } catch (e) {
    data = { title: '醫護鐵人賽事大廳', body: event.data.text() };
  }

  const title = data.title || '醫護鐵人賽事大廳';
  const options = {
    body: data.body || '您有一則新通知！',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'iron-medic-background-notify',
    data: {
      url: data.url || '/' // 點擊通知後要跳轉的網址
    }
  };

  // 🚀 觸發手機原生的系統通知 (即使 App 關閉中也會彈出)
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 🟢 3. 點擊推播通知時的喚醒動作
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // 先把通知關閉
  const targetUrl = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 如果 App 已經在背景開啟，直接把畫面切過去
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // 如果 App 完全關閉被滑掉了，則喚醒並開啟新視窗
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});