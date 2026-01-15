import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // 載入中顯示載入畫面
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">驗證登入狀態...</p>
        </div>
      </div>
    );
  }

  // 未登入則重定向到首頁
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 已登入則顯示內容
  return <>{children}</>;
}

