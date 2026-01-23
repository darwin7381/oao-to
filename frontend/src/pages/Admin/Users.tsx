import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../hooks/useRole';
import UserMenu from '../../components/UserMenu';
import Avatar from '../../components/Avatar';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  created_at: number;
}

export default function AdminUsers() {
  const { user: currentUser, token } = useAuth();
  const { isSuperAdmin } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入用戶列表（路由已確保有權限，直接載入）
  useEffect(() => {
    if (!token) return;

    const apiBase = window.location.hostname === 'localhost' 
      ? 'http://localhost:8788' 
      : 'https://api.oao.to';

    fetch(`${apiBase}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then(data => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  // 更新用戶角色
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isSuperAdmin) {
      alert('只有超級管理員可以變更角色');
      return;
    }

    if (!confirm(`確定要將此用戶的角色變更為 ${newRole}？`)) {
      return;
    }

    if (!token) return;
    
    const apiBase = window.location.hostname === 'localhost' 
      ? 'http://localhost:8788' 
      : 'https://api.oao.to';

    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      // 更新本地狀態
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      alert('✅ 角色已更新');
    } catch (err: any) {
      alert(`❌ 更新失敗：${err.message}`);
    }
  };

  // 資料載入中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">載入用戶列表...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">載入失敗</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/dashboard" className="btn btn-primary">
            返回儀表板
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
              OAO.TO
            </Link>
            <span className="text-sm text-gray-400">|</span>
            <h1 className="text-lg font-semibold text-gray-800">用戶管理</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn btn-secondary text-sm">
              ← 返回儀表板
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-sm text-gray-600">總用戶數</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-sm text-gray-600">一般用戶</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {users.filter(u => u.role === 'user').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-sm text-gray-600">管理員</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-sm text-gray-600">超級管理員</div>
            <div className="text-3xl font-bold text-purple-600 mt-1">
              {users.filter(u => u.role === 'superadmin').length}
            </div>
          </div>
        </div>

        {/* 用戶列表 */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">用戶列表</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    用戶
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    註冊時間
                  </th>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      操作
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={user.avatar} 
                          alt={user.name} 
                          size="md"
                        />
                        <div className="font-medium text-gray-900">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={user.id === currentUser?.id}
                          aria-label="選擇用戶角色"
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="user">用戶</option>
                          <option value="admin">管理員</option>
                          <option value="superadmin">超級管理員</option>
                        </select>
                        {user.id === currentUser?.id && (
                          <div className="text-xs text-gray-400 mt-1">無法修改自己的角色</div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              目前沒有用戶
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// 角色徽章組件
function RoleBadge({ role }: { role: string }) {
  const config = {
    user: {
      label: '用戶',
      icon: '👤',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    },
    admin: {
      label: '管理員',
      icon: '⭐',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    superadmin: {
      label: '超級管理員',
      icon: '👑',
      className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
  };

  const { label, icon, className } = config[role as keyof typeof config] || config.user;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

