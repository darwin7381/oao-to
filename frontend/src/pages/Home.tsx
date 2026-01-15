import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Home() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold text-gray-900">
          OAO.TO
        </h1>
        <p className="text-2xl text-gray-600">
          快速、安全、免費的短網址服務
        </p>
        
        <div className="space-y-4">
          <button
            onClick={login}
            className="btn btn-primary text-lg px-8 py-4"
          >
            使用 Google 登入
          </button>
          
          <div className="text-sm text-gray-500">
            ⚡ 全球邊緣網路 • 📊 詳細分析 • 🔒 安全可靠
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="card">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold mb-2">超快速度</h3>
            <p className="text-sm text-gray-600">
              基於 Cloudflare 全球網路，延遲 &lt; 10ms
            </p>
          </div>
          
          <div className="card">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold mb-2">詳細分析</h3>
            <p className="text-sm text-gray-600">
              追蹤點擊數、地理位置、設備類型等
            </p>
          </div>
          
          <div className="card">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-bold mb-2">安全可靠</h3>
            <p className="text-sm text-gray-600">
              資料加密、Google 認證、99.99% 可用性
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

