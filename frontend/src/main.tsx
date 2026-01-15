import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import NewHome from './pages/NewHome';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import AuthCallback from './pages/AuthCallback';
import AdminUsers from './pages/Admin/Users';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// 路由結構：
// / - 公開首頁（快速縮短）
// /auth/callback - OAuth 回調
// /dashboard - 管理儀表板（需登入）
// /analytics/:slug - 分析頁面（需登入）
// /admin/users - 用戶管理（需 admin 權限）
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NewHome />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
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
          path="/admin/users" 
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

