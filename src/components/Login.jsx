import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  // 🔵 Google 登入 (目前的主力！)
  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin // 登入成功後跳回首頁
      }
    });
    if (error) {
      alert("登入失敗：" + error.message);
      setLoading(false);
    }
  };

  // 📧 Email 登入 (備用方案)
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (error) {
      alert("發送失敗：" + error.message);
    } else {
      alert("✅ 已寄出登入信！\n請去信箱點擊連結，就會自動登入囉！");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
        
        {/* Logo 區塊 */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-navy text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
            ⚡
          </div>
          <h2 className="text-2xl font-bold text-navy">醫護鐵人賽事系統</h2>
          <p className="text-gray-500 text-sm mt-2">請登入以管理您的賽事</p>
        </div>

        {/* 🔵 Google 按鈕 (主角) */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-4 flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition active:scale-95 shadow-sm"
        >
          {loading ? "處理中..." : (
            <>
              {/* Google Icon */}
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
              使用 Google 帳號登入
            </>
          )}
        </button>

        {/* 分隔線 */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 font-medium">或使用 Email</span>
          </div>
        </div>

        {/* Email 表單 (配角) */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            placeholder="請輸入您的 Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition shadow-lg"
          >
            {loading ? "發送中..." : "寄送魔法連結 ✨"}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400">
          登入即代表您同意服務條款
        </p>
      </div>
    </div>
  );
}