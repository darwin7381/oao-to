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
import AdminLayout from './components/layout/AdminLayout';
import AdminStats from './pages/Admin/Stats';
import AdminPayments from './pages/Admin/Payments';
import AdminCreditsManagement from './pages/Admin/CreditsManagement';
import AdminSettings from './pages/Admin/Settings';
import AdminAuditLogs from './pages/Admin/AuditLogs';
import AdminSupport from './pages/Admin/SupportTickets';
import AdminPlans from './pages/Admin/PlansManagement';
import AdminLinks from './pages/Admin/Links';
import AdminApiKeysMonitoring from './pages/Admin/ApiKeysMonitoring';
import AdminAnalytics from './pages/Admin/Analytics';
// 路由結構：
// 公開路由：
// / - 公開首頁（快速縮短）
// /auth/callback - OAuth 回調
// /privacy - 隱私政策
// /terms - 服務條款
// /pricing - 價格方案
// /features - 功能介紹
// /support - 支援中心
// 
// Dashboard 路由（需登入）：
// /dashboard - 管理儀表板
// /dashboard/analytics/:slug - 分析頁面
// /dashboard/settings - 用戶設定
// /dashboard/api-keys - API 金鑰管理
// /dashboard/credits - Credits & Usage
// /dashboard/api-docs - API 文件
// 
// Admin 路由（需 admin 權限）：
// /admin/analytics - 分析總覽
// /admin/links - 連結管理
// /admin/api-keys - API 金鑰監控
// /admin/users - 用戶管理
// /admin/payments - 付費管理
// /admin/credits - Credits 管理
// /admin/stats - 系統統計
// /admin/settings - 系統設定
//
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

        {/* Admin Pages with Admin Layout */}
        <Route element={<AdminLayout />}>
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AdminAnalytics />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/links"
            element={
              <AdminRoute>
                <AdminLinks />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/api-keys"
            element={
              <AdminRoute>
                <AdminApiKeysMonitoring />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <AdminRoute>
                <AdminPayments />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/credits"
            element={
              <AdminRoute>
                <AdminCreditsManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/stats"
            element={
              <AdminRoute>
                <AdminStats />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <AdminRoute>
                <AdminAuditLogs />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/support"
            element={
              <AdminRoute>
                <AdminSupport />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/plans"
            element={
              <AdminRoute>
                <AdminPlans />
              </AdminRoute>
            }
          />
        </Route>

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

