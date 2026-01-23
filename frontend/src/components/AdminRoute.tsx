import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';

interface AdminRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export default function AdminRoute({ children, requireSuperAdmin = false }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();

  // 載入中顯示載入畫面
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">驗證管理員權限...</p>
        </div>
      </div>
    );
  }

  // 未登入則重定向到首頁
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 檢查權限
  if (requireSuperAdmin) {
    if (!isSuperAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">權限不足</h2>
            <p className="text-gray-600 mb-4">需要超級管理員權限</p>
            <Navigate to="/" replace />
          </div>
        </div>
      );
    }
  } else {
    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">權限不足</h2>
            <p className="text-gray-600 mb-4">需要管理員權限</p>
            <Navigate to="/" replace />
          </div>
        </div>
      );
    }
  }

  // 有權限則顯示內容
  return <>{children}</>;
}


