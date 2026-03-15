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

    const handleManualFire = async (race) => {
        const confirmFire = window.confirm(`🚨 警告：即將發射全域推播！\n\n確定要強制對所有會員手機發送【${race.name}】的賽事廣播嗎？\n(這將無視原本的排程時間，並同步推播小鈴鐺)`);
        
        if (!confirmFire) return;

        setFiringId(race.id);
        
        try {
            // 🌟 終極修正：把時間設定為「過去 1 分鐘」，消滅電腦與伺服器的毫秒時差！
            const pastTime = new Date(Date.now() - 60000).toISOString();

            await supabase.from('races')
                .update({ announce_time: pastTime, is_announced: false })
                .eq('id', race.id);

            // 呼叫全域發射站
            const res = await supabase.functions.invoke('broadcast-push');
            
            if (res.error) throw res.error;

            // 🌟 終極防呆：如果伺服器因為時差沒抓到資料，直接擋下來並警告！
            if (res.data && res.data.message && res.data.message.includes('無賽事')) {
                alert('⚠️ 系統提示：伺服器正在同步時間中，請等待 3 秒後再按一次「再次廣播」！');
                setFiringId(null);
                return;
            }

            alert('✅ 報告長官：強制發射成功！信號與小鈴鐺皆已精準送出！');
            fetchRaces(); 
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
                                    
                                    <div className="shrink-0 flex items-center justify-end gap-3">
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
                                        
                                        {isAnnounced && (
                                            <>
                                                <div className="hidden sm:flex items-center gap-2 text-emerald-600 bg-emerald-100 px-4 py-2.5 rounded-xl font-black border border-emerald-200">
                                                    <CheckCircle2 size={18}/> 任務已完成
                                                </div>
                                                <button 
                                                    onClick={() => handleManualFire(race)}
                                                    disabled={firingId === race.id}
                                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-black shadow-md transition-colors disabled:opacity-50"
                                                    title="重新發送推播與小鈴鐺通知"
                                                >
                                                    {firingId === race.id ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                                    再次廣播
                                                </button>
                                            </>
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