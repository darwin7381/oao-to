import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../hooks/useRole';
import UserMenu from '../../components/UserMenu';
import Avatar from '../../components/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Users, Shield, Crown, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminApi, type AdminUser } from '../../lib/adminApi';

export default function AdminUsers() {
  const { user: currentUser, token } = useAuth();
  const { isSuperAdmin } = useRole();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入用戶列表（路由已確保有權限，直接載入）
  useEffect(() => {
    loadUsers().catch((error) => {
      console.error('[Users] Unhandled error in loadUsers:', error);
    });
  }, [token]);

  const loadUsers = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsers();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 更新用戶角色
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isSuperAdmin) {
      alert('只有超級管理員可以變更角色');
      return;
    }

    if (!confirm(`確定要將此用戶的角色變更為 ${newRole}？`)) {
      return;
    }

    try {
      await adminApi.updateUserRole(userId, newRole);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">載入失敗</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/dashboard">
            <Button colorScheme="blue">返回儀表板</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">User Management</h1>
        <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
        <p className="text-lg text-gray-500 font-medium">
          Manage platform users, roles, and permissions
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Users"
          value={users.length}
          icon={Users}
          color="blue"
          delay={0.1}
        />
        <StatsCard
          label="Verified Users"
          value={users.filter(u => u.role === 'user').length}
          icon={Shield}
          color="green"
          delay={0.2}
        />
        <StatsCard
          label="Admins"
          value={users.filter(u => u.role === 'admin').length}
          icon={Shield}
          color="indigo"
          delay={0.3}
        />
        <StatsCard
          label="Super Admins"
          value={users.filter(u => u.role === 'superadmin').length}
          icon={Crown}
          color="purple"
          delay={0.4}
        />
      </div>

      {/* Controls & Table */}
      <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/50 border-b border-blue-50 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            User Directory
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none text-sm transition-all w-64"
              />
            </div>
            <Button variant="outline" size="sm" colorScheme="blue" className="rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={user.avatar}
                        alt={user.name}
                        size="md"
                        className="ring-2 ring-white shadow-sm"
                      />
                      <div>
                        <div className="font-bold text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    {new Date(user.created_at).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {isSuperAdmin && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={user.id === currentUser?.id}
                          className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:border-blue-300 transition-colors"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No users found</h3>
              <p className="text-gray-500">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

const StatsCard = ({ label, value, icon: Icon, color, delay }: any) => {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between"
    >
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorStyles[color as keyof typeof colorStyles]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </motion.div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config = {
    user: {
      label: 'User',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    admin: {
      label: 'Admin',
      className: 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm shadow-blue-100',
    },
    superadmin: {
      label: 'Super Admin',
      className: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-200 shadow-sm shadow-purple-100',
    },
  };

  const { label, className } = config[role as keyof typeof config] || config.user;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${className}`}>
      {label}
    </span>
  );
}

