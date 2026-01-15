import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';
import Avatar from './Avatar';

export default function UserMenu() {
  const { user, loading, login, logout } = useAuth();
  const { isAdmin } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉選單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // 載入中顯示佔位符
  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
    );
  }

  // 未登入顯示登入按鈕
  if (!user) {
    return (
      <button onClick={login} className="btn btn-primary">
        <span className="mr-2">🔐</span>
        使用 Google 登入
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 用戶頭像按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Avatar 
          src={user.avatar} 
          alt={user.name} 
          size="sm" 
          className="border-2 border-gray-200"
        />
        <div className="text-left hidden md:block">
          <div className="text-sm font-semibold text-gray-800">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* 用戶資訊 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Avatar 
                src={user.avatar} 
                alt={user.name} 
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{user.name}</div>
                <div className="text-sm text-gray-500 truncate">{user.email}</div>
                {user.role && (
                  <div className="mt-1">
                    <RoleBadge role={user.role} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 選單項目 */}
          <div className="py-1">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">📊</span>
              <span>我的短網址</span>
            </Link>

            {/* 管理員選項 - 只有 admin 和 superadmin 能看到 */}
            {isAdmin && user && (user.role === 'admin' || user.role === 'superadmin') && (
              <>
                <div className="border-t border-gray-100 my-1"></div>
                <div className="px-4 py-1">
                  <div className="text-xs font-semibold text-gray-400 uppercase">管理功能</div>
                </div>
                <Link
                  to="/admin/users"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">👥</span>
                  <span>用戶管理</span>
                </Link>
                <Link
                  to="/admin/stats"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">📈</span>
                  <span>系統統計</span>
                </Link>
              </>
            )}

            <div className="border-t border-gray-100 my-1"></div>
            
            {/* 登出 */}
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="text-lg">🚪</span>
              <span>登出</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 角色徽章組件
function RoleBadge({ role }: { role: string }) {
  const config = {
    user: {
      label: '用戶',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    },
    admin: {
      label: '管理員',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    superadmin: {
      label: '超級管理員',
      className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
  };

  const { label, className } = config[role as keyof typeof config] || config.user;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${className}`}>
      {label}
    </span>
  );
}

