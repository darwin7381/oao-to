import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import NewHome from './pages/NewHome';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import AuthCallback from './pages/AuthCallback';
import AdminUsers from './pages/Admin/Users';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import FeaturesPage from './pages/FeaturesPage';
import Support from './pages/Support';
import LinkPreview from './pages/LinkPreview';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// 路由結構：
// / - 公開首頁（快速縮短）
// /auth/callback - OAuth 回調
// /dashboard - 管理儀表板（需登入）
// /analytics/:slug - 分析頁面（需登入）
// /admin/users - 用戶管理（需 admin 權限）
// /privacy - 隱私政策
// /terms - 服務條款
// /settings - 用戶設定（需登入）
// /pricing - 價格方案
// /features - 功能介紹
// /support - 支援中心
// /:slug/preview - 短網址預覽
// * - 404 錯誤頁面
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NewHome />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Public Pages */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/support" element={<Support />} />
        <Route path="/:slug/preview" element={<LinkPreview />} />
        
        {/* Protected Pages */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics/:slug" 
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        
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
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

