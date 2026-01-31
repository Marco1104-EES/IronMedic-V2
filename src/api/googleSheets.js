// src/api/googleSheets.js

// 🔴 請把下面這串換成您剛剛複製的網址！
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCvtI1Lz2YOG-gDUUXy5E0VwiuFZAkBjFZxppCAOCAOqfXyVHlE5dimrb-HqMvrRcC/exec"; 

export const syncToGoogleSheets = async (payload) => {
  // 如果忘記貼網址，在 Console 警告
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("您的網址")) {
    console.error("⚠️ 嚴重錯誤：請先去 src/api/googleSheets.js 貼上 Google Script 網址！");
    alert("⚠️ 系統未連接 Excel，請聯絡管理員設定 API 網址。");
    return;
  }

  try {
    // 發送資料給 Google Sheet (單向發送)
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    console.log("✅ 資料已發送至 Excel");
  } catch (error) {
    console.error("❌ Excel 連線失敗:", error);
  }
};