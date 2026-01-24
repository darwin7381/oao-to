import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import NewHome from './pages/NewHome';
import Dashboard from './pages/dashboard/Dashboard';
import Analytics from './pages/dashboard/Analytics';
import AuthCallback from './pages/AuthCallback';
import AdminUsers from './pages/Admin/Users';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import Settings from './pages/dashboard/Settings';
import Pricing from './pages/Pricing';
import FeaturesPage from './pages/FeaturesPage';
import Support from './pages/Support';
import LinkPreview from './pages/LinkPreview';
import ApiKeys from './pages/dashboard/ApiKeys';
import Credits from './pages/dashboard/Credits';
import ApiDocs from './pages/dashboard/ApiDocs';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import DashboardLayout from './components/layout/DashboardLayout';
// 路由結構：
// / - 公開首頁（快速縮短）
// /auth/callback - OAuth 回調
// /dashboard - 管理儀表板（需登入）
// /dashboard/analytics/:slug - 分析頁面（需登入）
// /dashboard/settings - 用戶設定（需登入）
// /dashboard/api-keys - API 金鑰管理（需登入）
// /dashboard/credits - Credits & Usage（需登入）
// /dashboard/api-docs - API 文件
// /admin/users - 用戶管理（需 admin 權限）
// /privacy - 隱私政策
// /terms - 服務條款
// /pricing - 價格方案
// /features - 功能介紹
// /support - 支援中心
// /:slug/preview - 短網址預覽
// * - 404 錯誤頁面
function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<NewHome />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Public Pages */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/support" element={<Support />} />
        {/* Protected Pages with Dashboard Layout */}
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/analytics/:slug"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/api-keys"
            element={
              <ProtectedRoute>
                <ApiKeys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/credits"
            element={
              <ProtectedRoute>
                <Credits />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/api-docs"
            element={
              <ApiDocs />
            }
          />
        </Route>

        {/* Admin Pages */}
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);

