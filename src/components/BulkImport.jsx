import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

export default function BulkImport() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState([]);

  // 1. 讀取 Excel 檔案
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      // 轉成 JSON，header: 0 代表第一列是標題
      const data = XLSX.utils.sheet_to_json(ws, { header: 0 });
      setPreviewData(data);
      addLog(`📄 讀取成功，共 ${data.length} 筆資料`);
    };
    reader.readAsBinaryString(selectedFile);
  };

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  // 2. 開始匯入 (核心邏輯：解析舊表單 -> 寫入新系統)
  const handleImport = async () => {
    if (!previewData.length) return;
    setUploading(true);
    addLog("🚀 開始匯入資料庫...");

    let successCount = 0;
    let errorCount = 0;

    for (const row of previewData) {
      try {
        // --- A. 基本資料 mapping (需依照您真實 Excel 欄位名稱修改) ---
        // 假設 Excel 欄位是：["姓名", "身分證字號", "Email", "背心尺寸"]
        const citizenId = row['身分證字號'] || row['ID']; // 容錯抓取
        const fullName = row['姓名'] || row['Name'];
        const email = row['Email'] || `${citizenId}@placeholder.com`; // 若無 Email 暫時用假體

        if (!citizenId) continue; // 沒 ID 就跳過

        // --- B. 處理 User Profile (Upsert) ---
        // 這裡因為 Supabase Auth 需要獨立註冊，我們先假設是純資料匯入
        // 實務上通常會先檢查 user_metadata，或直接寫入 profiles 表
        
        // 模擬：寫入 profiles 表
        const { data: profile, error: profileError } = await supabase
          .from('profiles') // 假設您有這張表
          .upsert({ 
            citizen_id: citizenId,
            full_name: fullName, 
            vest_size: row['背心尺寸']
          }, { onConflict: 'citizen_id' })
          .select()
          .single();

        if (profileError) throw new Error(`Profile Error: ${profileError.message}`);

        // --- C. 處理複雜身分 (Priority Logic) ---
        // 解析 Excel 的 "身分備註" 欄位
        const statusNote = row['身分備註'] || ''; 
        
        // 1. 帶隊官
        if (statusNote.includes('帶隊') || statusNote.includes('教官')) {
            await supabase.from('member_privileges').upsert({
                user_id: profile.id,
                role_type: 'leader',
                is_active: true,
                valid_year: 2026
            });
        }

        // 2. 新會員 (給 2 次扣打)
        if (statusNote.includes('新會員')) {
            await supabase.from('member_privileges').upsert({
                user_id: profile.id,
                role_type: 'new_member',
                credits: 2, // 初始 2 次
                is_active: true
            });
        }

        // --- D. 處理三鐵衣效期 (Uniforms) ---
        // 假設欄位叫 "三鐵衣效期" (格式可能不統一，這裡做簡單處理)
        const expiryRaw = row['三鐵衣效期']; 
        if (expiryRaw) {
            // 這裡通常需要寫一個日期轉換函式，因為 Excel 日期可能是數字或文字
            // 暫時假設是文字 '2026/12/31'
            await supabase.from('uniforms').upsert({
                user_id: profile.id,
                uniform_type: 'trisuit',
                expiry_date: expiryRaw, 
                is_active: true
            });
        }

        successCount++;

      } catch (err) {
        console.error(err);
        errorCount++;
        addLog(`❌ ${row['姓名']} 匯入失敗: ${err.message}`);
      }
    }

    addLog(`✅ 匯入完成！成功: ${successCount}, 失敗: ${errorCount}`);
    setUploading(false);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-navy mb-6 flex items-center gap-2">
        📂 呆瓜式資料匯入 (Excel/CSV)
      </h2>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition bg-gray-50/50">
        <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload} 
            className="hidden" 
            id="fileInput"
        />
        <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
            <span className="text-4xl mb-2">📄</span>
            <span className="text-gray-600 font-bold">點擊選擇或是拖曳「基本資料表」到這裡</span>
            <span className="text-xs text-gray-400 mt-2">支援 .xlsx, .csv 格式</span>
        </label>
      </div>

      {previewData.length > 0 && (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-500">預覽前 5 筆資料：</span>
                <button 
                    onClick={handleImport} 
                    disabled={uploading}
                    className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition ${uploading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {uploading ? '處理中...' : `確認匯入 ${previewData.length} 筆資料`}
                </button>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs text-left text-gray-600">
                    <thead className="bg-gray-100 uppercase text-gray-700 font-bold">
                        <tr>
                            {Object.keys(previewData[0]).slice(0, 6).map(key => (
                                <th key={key} className="px-4 py-3">{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                                {Object.values(row).slice(0, 6).map((val, j) => (
                                    <td key={j} className="px-4 py-2">{val}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* 執行紀錄終端機 */}
      <div className="mt-6 bg-black rounded-xl p-4 h-48 overflow-y-auto custom-scrollbar font-mono text-xs text-green-400 shadow-inner">
          <p className="opacity-50 border-b border-gray-700 pb-2 mb-2">System Logs...</p>
          {logs.map((log, i) => <div key={i}>{log}</div>)}
          {logs.length === 0 && <div className="text-gray-600">等待操作...</div>}
      </div>
    </div>
  );
}