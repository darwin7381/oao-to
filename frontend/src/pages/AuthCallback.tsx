import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [status, setStatus] = useState('處理中...');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      setStatus('✅ 登入成功！儲存 token...');
      localStorage.setItem('token', token);
      
      // 刷新認證狀態
      refreshAuth().then(() => {
        setStatus('✅ 跳轉中...');
        setTimeout(() => navigate('/dashboard'), 300);
      });
    } else {
      setStatus('❌ 沒有收到 token');
      setTimeout(() => navigate('/'), 1500);
    }
  }, [searchParams, navigate, refreshAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">登入處理中</h2>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

