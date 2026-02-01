// src/api/googleSheets.js
// V17.0 馬里亞納級引擎 - 支援深層格式清洗與精確打擊

// 🔴 請艦長務必填入您的 Google 憑證 (這是免費的)
const SPREADSHEET_ID = '12En3fR2oiikpQrHrXiEG7FpRRqOVJsPRMHy4AIyiV9A'; 
const CLIENT_ID = 'IronMedic API'; // <--- 請填入
const API_KEY = 'AIzaSyBzbJ7bR-ehZ9recinR8wqBxZ0SqYRj-C8';     // <--- 請填入
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// 1. 初始化系統 (保持不變)
export function loadGoogleScripts(callback) {
  const script1 = document.createElement('script');
  script1.src = 'https://apis.google.com/js/api.js';
  script1.async = true;
  script1.defer = true;
  script1.onload = () => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'] });
      gapiInited = true;
      if (gisInited) callback();
    });
  };
  document.body.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = 'https://accounts.google.com/gsi/client';
  script2.async = true;
  script2.defer = true;
  script2.onload = () => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', 
    });
    gisInited = true;
    if (gapiInited) callback();
  };
  document.body.appendChild(script2);
}

// 2. 戰前磨刀機制 (Force Token Refresh)
const ensureToken = async () => {
  return new Promise((resolve, reject) => {
    // 強制請求 Token，確保是熱騰騰的
    tokenClient.callback = (resp) => {
      if (resp.error) reject(resp);
      resolve(resp);
    };
    // 靜默請求 (如果已授權過，不會彈窗)
    if (window.gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
  });
}

// 3. V17.0 核心：舊表單橫向同步 (Legacy Sync)
export async function syncLegacyFormat(eventName, participants) {
  // Step 1: 戰前磨刀
  await ensureToken();

  try {
    // Step 2: 偵查 (Recon) - 讀取舊表單 A 欄尋找座標
    const sheetName = '2019任務賽事'; // 🔴 請確認這是舊表單正確的工作表名稱
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:A`, 
    });

    const rows = response.result.values;
    let targetRowIndex = -1;

    if (rows && rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        // 模糊比對：只要包含關鍵字就算找到
        if (rows[i][0] && (rows[i][0].includes(eventName) || eventName.includes(rows[i][0]))) {
          targetRowIndex = i + 1; // Excel 列號從 1 開始
          break;
        }
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`座標遺失：在舊表單中找不到賽事「${eventName}」。請確認 A 欄名稱是否一致。`);
    }

    // Step 3: 變形 (Transform) - 轉置為橫向陣列
    // 格式： "姓名 (組別)"
    const flatList = participants.map(p => `${p.user_name} (${p.category})`);
    
    // Step 4: 強效清洗與打擊 (Strike)
    // 我們從 AA 欄 (第27欄) 開始寫
    // 計算結束欄位：AA + N筆資料
    const range = `${sheetName}!AA${targetRowIndex}`;
    
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED', // ✨ 關鍵：告訴 Google 這是使用者輸入的，強制重算格式
      resource: {
        values: [flatList] // 橫向寫入
      },
    });

    return `座標 Row ${targetRowIndex} 確認命中。\n成功寫入 ${flatList.length} 筆資料 (AA欄起)。`;

  } catch (err) {
    console.error("V17 Sync Error:", err);
    throw err;
  }
}

// 4. (保留) 新表單同步函式 - 如果您還有用到的話
export async function syncToGoogleSheets(data) {
    // ... 
}