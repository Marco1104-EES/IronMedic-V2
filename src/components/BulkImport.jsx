import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';

export default function BulkImport() {
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState([]); // 儲存檢查到的錯誤
  const [validRows, setValidRows] = useState([]); // 儲存通過檢查的資料

  // 📥 功能：下載標準範例 CSV
  const downloadTemplate = () => {
    // 定義標準標題與一行範例資料
    const csvContent = "\uFEFFemail,real_name,phone,citizen_id,emt_level\nexample@gmail.com,王小明,0912345678,A123456789,EMT-1";
    
    // 建立虛擬下載連結
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "會員匯入標準範本.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔍 功能：檢查 0 與 O 的混淆 (Regex)
  const checkConfusingChars = (text) => {
    if (!text) return false;
    // 檢查是否包含大寫 O 或小寫 o，這在電話或數字欄位通常是錯的
    return /[Oo]/.test(text);
  };

  // 📂 功能：處理檔案上傳與驗證
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 重置狀態
    setUploading(true);
    setLogs([]);
    setErrors([]);
    setValidRows([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const newErrors = [];
        const cleanRows = [];

        // --- 🕵️‍♂️ 開始逐行檢查 ---
        rows.forEach((row, index) => {
          const rowNum = index + 2; // 因為 Excel 第一行是標題，所以資料從第 2 行開始
          let rowError = [];

          // 1. 檢查必填欄位 (全部都是必須)
          if (!row.email) rowError.push("缺 Email");
          if (!row.real_name) rowError.push("缺姓名");
          if (!row.phone) rowError.push("缺電話");
          if (!row.citizen_id) rowError.push("缺身分證");
          if (!row.emt_level) rowError.push("缺 EMT 等級");

          // 2. 檢查 0 與 O 混淆 (針對電話與身分證)
          // 電話應該只有數字，如果有 O 代表打錯了
          if (row.phone && checkConfusingChars(row.phone)) {
            rowError.push("電話含有英文字母 O/o (請檢查是否應為數字 0)");
          }
          // 身分證通常只有第一碼是英文，後面如果出現 O 也很可疑 (這裡做簡單檢查)
          if (row.citizen_id && row.citizen_id.length > 1) {
             const suffix = row.citizen_id.substring(1); // 取第一碼之後的字
             if (checkConfusingChars(suffix)) {
               rowError.push("身分證數字部分含有英文字母 O/o");
             }
          }

          if (rowError.length > 0) {
            newErrors.push({
              row: rowNum,
              name: row.real_name || "未知",
              email: row.email || "未知",
              reasons: rowError
            });
          } else {
            cleanRows.push(row);
          }
        });

        // 設定檢查結果
        setErrors(newErrors);
        setValidRows(cleanRows);
        setUploading(false);

        if (newErrors.length === 0 && cleanRows.length > 0) {
          setLogs([`✅ 完美！共 ${cleanRows.length} 筆資料格式正確，準備好可以上傳了。`]);
        } else if (newErrors.length > 0) {
          setLogs([`❌ 發現 ${newErrors.length} 筆錯誤資料，請修正 Excel 後再重新上傳。`]);
        }
      },
      error: (error) => {
        setUploading(false);
        setLogs([`❌ 檔案解析失敗: ${error.message}`]);
      }
    });
  };

  // 🚀 功能：執行最終上傳 (只上傳正確的資料)
  const executeUpload = async () => {
    if (validRows.length === 0) {
      alert("沒有正確的資料可以上傳！");
      return;
    }

    setUploading(true);
    const { error } = await supabase
      .from('wix_import')
      .upsert(validRows, { onConflict: 'email' });

    setUploading(false);

    if (error) {
      alert("上傳資料庫失敗：" + error.message);
    } else {
      alert(`🎉 成功匯入 ${validRows.length} 筆資料！`);
      setLogs(prev => [`🚀 上傳完成！資料庫已更新。`, ...prev]);
      setValidRows([]); // 清空暫存，避免重複按
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      
      {/* 標題與下載範本區 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold text-navy flex items-center gap-2">
          📂 會員資料匯入倉儲站
          <span className="text-xs font-normal text-white bg-green-600 px-2 py-1 rounded-full">CSV 格式</span>
        </h3>
        
        {/* 🔴 紅圈需求：下載標準表格按鈕 */}
        <button 
          onClick={downloadTemplate}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-gray-300 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          下載標準輸入表格 (.csv)
        </button>
      </div>
      
      {/* 🟢 綠圈需求：所有欄位說明 (全改為必須) */}
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-navy text-white">
            <tr>
              <th className="px-4 py-2">Excel 標題 (英文)</th>
              <th className="px-4 py-2">中文說明</th>
              <th className="px-4 py-2">範例 (請注意 0 與 O)</th>
              <th className="px-4 py-2 text-center">需要</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-gray-50">
            <tr>
              <td className="px-4 py-2 font-mono text-blue-700 font-bold">email</td>
              <td className="px-4 py-2">唯一帳號</td>
              <td className="px-4 py-2 font-mono text-gray-500">marco@gmail.com</td>
              <td className="px-4 py-2 text-center text-red-600 font-bold">✔ 必須</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-blue-700 font-bold">real_name</td>
              <td className="px-4 py-2">真實姓名</td>
              <td className="px-4 py-2 text-gray-500">王小明</td>
              <td className="px-4 py-2 text-center text-red-600 font-bold">✔ 必須</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-blue-700 font-bold">phone</td>
              <td className="px-4 py-2">電話</td>
              <td className="px-4 py-2 font-mono text-gray-500">0912345678</td>
              <td className="px-4 py-2 text-center text-red-600 font-bold">✔ 必須</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-blue-700 font-bold">citizen_id</td>
              <td className="px-4 py-2">身分證</td>
              <td className="px-4 py-2 font-mono text-gray-500">A123456789</td>
              <td className="px-4 py-2 text-center text-red-600 font-bold">✔ 必須</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-blue-700 font-bold">emt_level</td>
              <td className="px-4 py-2">證照等級</td>
              <td className="px-4 py-2 text-gray-500">EMT-1</td>
              <td className="px-4 py-2 text-center text-red-600 font-bold">✔ 必須</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 檔案上傳區 */}
      <div className="flex items-center gap-4 mb-6">
        <label className="cursor-pointer bg-navy text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition shadow-lg font-bold flex items-center gap-2">
          <span>📤 選擇 CSV 並驗證</span>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        
        {/* 只有當全部正確時，才顯示確認上傳按鈕 */}
        {validRows.length > 0 && errors.length === 0 && (
          <button 
            onClick={executeUpload}
            disabled={uploading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition shadow-lg font-bold animate-pulse"
          >
            {uploading ? "上傳中..." : `🚀 確認匯入 ${validRows.length} 筆資料`}
          </button>
        )}
      </div>

      {/* ⛔ 錯誤檢核視窗 (如果有錯誤才會出現) */}
      {errors.length > 0 && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <h4 className="text-red-700 font-bold text-lg mb-2 flex items-center gap-2">
            ⛔ 檢核失敗：發現 {errors.length} 筆資料有誤
          </h4>
          <p className="text-sm text-red-600 mb-4">請修正 Excel 檔案中的以下問題後，重新上傳。</p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-red-100 text-red-800">
                <tr>
                  <th className="p-2 border border-red-200">Excel 列號</th>
                  <th className="p-2 border border-red-200">姓名</th>
                  <th className="p-2 border border-red-200">Email</th>
                  <th className="p-2 border border-red-200">錯誤原因 (請注意 0/O 區分)</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="p-2 border border-red-200 text-center font-bold">{err.row}</td>
                    <td className="p-2 border border-red-200">{err.name}</td>
                    {/* 使用 font-mono (等寬字體) 讓 0 和 O 看起來明顯不同 */}
                    <td className="p-2 border border-red-200 font-mono">{err.email}</td>
                    <td className="p-2 border border-red-200 text-red-600 font-bold">
                      {err.reasons.join("、")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 系統日誌 */}
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-32 overflow-y-auto shadow-inner">
        {logs.length === 0 ? (
          <div className="text-gray-500 opacity-50 select-none">等待檔案上傳中...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1 border-b border-gray-800 pb-1 last:border-0">{log}</div>
          ))
        )}
      </div>
    </div>
  );
}