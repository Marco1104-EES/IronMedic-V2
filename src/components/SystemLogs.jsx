import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

export default function SystemLogs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    // 抓取 system_jobs 表，最新的排上面
    const { data, error } = await supabase
      .from('system_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) // 只看最近 50 筆

    if (error) console.error('無法讀取日誌:', error)
    else setJobs(data || [])
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 min-h-[500px]">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <FileText className="mr-2 text-blue-600" /> 系統作業日誌 (Logs)
      </h2>

      <div className="overflow-hidden border rounded-lg">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="p-4">作業時間</th>
              <th className="p-4">任務類型</th>
              <th className="p-4">執行結果</th>
              <th className="p-4 text-right">處理筆數</th>
              <th className="p-4">詳細內容</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">載入中...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">目前沒有紀錄</td></tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-500 font-mono">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                      {job.job_type === 'member_import' ? '會員匯入' : job.job_type}
                    </span>
                  </td>
                  <td className="p-4">
                    {job.status === 'completed' && <span className="flex items-center text-green-600 font-bold"><CheckCircle size={16} className="mr-1"/> 成功</span>}
                    {job.status === 'completed_with_errors' && <span className="flex items-center text-orange-500 font-bold"><AlertTriangle size={16} className="mr-1"/> 部分錯誤</span>}
                    {job.status === 'failed' && <span className="flex items-center text-red-600 font-bold"><XCircle size={16} className="mr-1"/> 失敗</span>}
                    {job.status === 'processing' && <span className="flex items-center text-blue-600 font-bold"><Clock size={16} className="mr-1 animate-spin"/> 執行中</span>}
                  </td>
                  <td className="p-4 text-right font-mono">
                    <span className="text-green-600">{job.success_count}</span> / <span className="text-gray-400">{job.total_count}</span>
                  </td>
                  <td className="p-4 text-gray-500 max-w-xs truncate" title={JSON.stringify(job.error_log)}>
                    {job.error_count > 0 ? (
                      <span className="text-red-400 cursor-help underline">查看 {job.error_count} 筆錯誤</span>
                    ) : (
                      <span className="text-gray-300">無異常</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}