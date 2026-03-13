import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Radio, CalendarClock, Send, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

export default function RaceBroadcast() {
    const [races, setRaces] = useState([])
    const [loading, setLoading] = useState(true)
    const [firingId, setFiringId] = useState(null)

    useEffect(() => {
        fetchRaces()
    }, [])

    const fetchRaces = async () => {
        setLoading(true)
        try {
            // 抓出所有有設定「預定廣播時間(announce_time)」的賽事
            const { data, error } = await supabase
                .from('races')
                .select('id, name, date, announce_time, is_announced, status')
                .not('announce_time', 'is', null)
                .order('announce_time', { ascending: false })
            
            if (error) throw error
            setRaces(data || [])
        } catch (error) {
            console.error('讀取廣播清單失敗:', error)
        } finally {
            setLoading(false)
        }
    }

    // 🚨 終極手動核彈發射按鈕
    const handleManualFire = async (race) => {
        const confirmFire = window.confirm(`🚨 警告：即將發射全域推播！\n\n確定要強制對所有會員手機發送【${race.name}】的賽事廣播嗎？\n(這將無視原本的排程時間)`);
        
        if (!confirmFire) return;

        setFiringId(race.id);
        
        try {
            // 呼叫 Edge Function
            const { data, error } = await supabase.functions.invoke('broadcast-push', {
                // 我們可以帶參數進去，或者直接讓 Edge Function 去抓 (目前 Edge Function 是自己抓資料庫的)
                // 為了強制發送特定一場，這裡我們假設您之後可以升級 Edge Function 接收指定 ID，
                // 但現行版本我們直接更新資料庫讓它假裝「時間到了」，然後等一分鐘讓機器人去發。
                // 為了「即時手動」，我們直接在前端觸發！
            });

            // ⚠️ 注意：因為我們原本寫的 Edge Function 是無差別去抓「時間到了」的賽事。
            // 這裡的「手動發射」，最簡單的做法是：強制把這場賽事的 announce_time 改成「現在」，
            // 然後手動呼叫一次 Edge Function 去執行。

            // 1. 強制修改時間為現在，並設定為未廣播
            await supabase.from('races')
                .update({ announce_time: new Date().toISOString(), is_announced: false })
                .eq('id', race.id);

            // 2. 呼叫發射站
            const res = await supabase.functions.invoke('broadcast-push');
            
            if (res.error) throw res.error;

            alert('✅ 強制發射成功！信號已送出！');
            fetchRaces(); // 刷新清單
        } catch (error) {
            console.error('發射失敗:', error);
            alert(`發射發生異常：${error.message}`);
        } finally {
            setFiringId(null);
        }
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Radio className="text-blue-600"/> 賽事任務群體廣播清單
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">
                            監控系統排定的自動廣播任務。如有突發狀況，可使用緊急按鈕手動強制發射推播。
                        </p>
                    </div>
                    <button 
                        onClick={fetchRaces}
                        disabled={loading}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                        {loading ? '更新中...' : '重新整理'}
                    </button>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin mb-4" size={32}/>
                        <span className="font-bold tracking-widest">掃描發射排程中...</span>
                    </div>
                ) : races.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        <CalendarClock className="mb-4 opacity-50" size={48}/>
                        <span className="font-bold text-lg text-slate-500">目前沒有設定廣播的賽事</span>
                        <span className="text-sm mt-1">請至「建立新賽事」或「編輯任務」中設定【預定全域廣播時間】。</span>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {races.map((race) => {
                            const isPast = new Date(race.announce_time) <= new Date();
                            const isAnnounced = race.is_announced;
                            
                            // 狀態卡片樣式判斷
                            let statusClass = "border-slate-200 bg-white";
                            let statusText = "等待排程中";
                            let statusIcon = <CalendarClock size={20} className="text-slate-400"/>;
                            
                            if (isAnnounced) {
                                statusClass = "border-emerald-200 bg-emerald-50";
                                statusText = "已成功廣播";
                                statusIcon = <CheckCircle2 size={20} className="text-emerald-500"/>;
                            } else if (isPast && !isAnnounced) {
                                statusClass = "border-amber-200 bg-amber-50";
                                statusText = "排隊準備發送中...";
                                statusIcon = <RefreshCw size={20} className="text-amber-500 animate-spin"/>;
                            }

                            return (
                                <div key={race.id} className={`p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${statusClass}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {statusIcon}
                                            <span className={`text-xs font-black uppercase tracking-wider ${isAnnounced ? 'text-emerald-600' : isPast ? 'text-amber-600' : 'text-slate-500'}`}>
                                                {statusText}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 line-clamp-1">{race.name}</h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
                                            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">賽事日: {race.date}</span>
                                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                <Radio size={14}/> 預定廣播: {new Date(race.announce_time).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="shrink-0 flex items-center justify-end">
                                        {/* 如果還沒發送，顯示緊急發送按鈕 */}
                                        {!isAnnounced && (
                                            <button 
                                                onClick={() => handleManualFire(race)}
                                                disabled={firingId === race.id}
                                                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-black shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors disabled:opacity-50"
                                            >
                                                {firingId === race.id ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                                強制手動廣播
                                            </button>
                                        )}
                                        {/* 如果已發送，顯示已完成標記 */}
                                        {isAnnounced && (
                                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-100 px-4 py-2.5 rounded-xl font-black border border-emerald-200">
                                                <CheckCircle2 size={18}/> 任務已完成
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}