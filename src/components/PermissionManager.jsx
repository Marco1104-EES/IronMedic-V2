import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function PermissionManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // 抓取所有用戶的權限資料
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching roles:', error);
    else setUsers(data || []);
    setLoading(false);
  };

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert("權限修改失敗：" + error.message);
    } else {
      alert("權限更新成功！");
      fetchUsers(); // 重新整理列表
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">載入權限列表中...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border-2 border-purple-100 mb-8">
      <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
        👑 最高權限控制台 (指派操作者)
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-purple-50 text-purple-900">
            <tr>
              <th className="px-4 py-2 rounded-l-lg">Email 帳號</th>
              <th className="px-4 py-2">目前身分</th>
              <th className="px-4 py-2 rounded-r-lg">變更權限</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold
                    ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                      user.role === 'admin' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                      'bg-gray-100 text-gray-500'}`}>
                    {user.role === 'super_admin' ? '👑 最高權限' : user.role === 'admin' ? '🛠️ 操作者' : '👤 一般會員'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {/* 只有非 Super Admin 才能被修改 (防止自己鎖死自己) */}
                  {user.role !== 'super_admin' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateRole(user.id, 'admin')}
                        className={`px-3 py-1 rounded border text-xs transition
                            ${user.role === 'admin' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}
                        `}
                      >
                        設為操作者
                      </button>
                      <button 
                        onClick={() => updateRole(user.id, 'user')}
                        className={`px-3 py-1 rounded border text-xs transition
                            ${user.role === 'user' ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
                        `}
                      >
                        設為一般人
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}