import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, type Analytics as AnalyticsType } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import UserMenu from '../components/UserMenu';

export default function Analytics() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    
    api.getAnalytics(slug)
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">載入中...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">找不到數據</h2>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700">
            ← 返回儀表板
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← 返回儀表板
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          {slug} 的分析數據
        </h1>

        {/* 總覽 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm text-gray-600 mb-1">總點擊數</h3>
            <p className="text-3xl font-bold">{analytics.totalClicks}</p>
          </div>
          <div className="card">
            <h3 className="text-sm text-gray-600 mb-1">國家數量</h3>
            <p className="text-3xl font-bold">{analytics.byCountry.length}</p>
          </div>
          <div className="card">
            <h3 className="text-sm text-gray-600 mb-1">設備類型</h3>
            <p className="text-3xl font-bold">{analytics.byDevice.length}</p>
          </div>
        </div>

        {/* 按國家分佈 */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">按國家分佈</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.byCountry.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="country" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="clicks" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 時間趨勢 */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">過去 7 天趨勢</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="clicks" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 設備類型 */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">設備類型</h2>
          <div className="space-y-2">
            {analytics.byDevice.map((item) => (
              <div key={item.device} className="flex justify-between items-center">
                <span className="font-medium">{item.device}</span>
                <span className="text-gray-600">{item.clicks} 次</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

