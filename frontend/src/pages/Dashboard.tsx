import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { type Link as LinkType } from '../lib/api';
import UserMenu from '../components/UserMenu';

export default function Dashboard() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ url: '', slug: '', title: '' });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    const apiUrl = import.meta.env.PROD 
      ? 'https://api.oao.to/test-list'
      : 'http://localhost:8788/test-list';
    
    const shortUrlBase = import.meta.env.PROD
      ? 'https://oao.to'
      : 'http://localhost:8787';  // core-worker
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      setLinks(data.links.map((link: any) => ({
        ...link,
        shortUrl: `${shortUrlBase}/${link.slug}`,
      })));
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const apiUrl = import.meta.env.PROD 
      ? 'https://api.oao.to/shorten'
      : 'http://localhost:8788/shorten';
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: createData.url,
          customSlug: createData.slug || undefined,  // 空字串時不傳，讓後端生成隨機 slug
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '創建失敗');
      }

      const data = await response.json();
      
      alert(`✅ 短網址創建成功！\n\n短網址: ${data.shortUrl}\n代碼: ${data.slug}`);
      setShowCreateModal(false);
      setCreateData({ url: '', slug: '', title: '' });
      
      // 重新載入列表
      loadLinks();
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('確定要刪除這個短網址嗎？')) return;
    
    try {
      // 暫時直接從 UI 刪除（稍後實作 API）
      setLinks(links.filter(l => l.slug !== slug));
      alert('✅ 已從列表移除');
    } catch (error: any) {
      alert(`❌ 刪除失敗：${error.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已複製到剪貼簿');
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
            OAO.TO
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="btn btn-secondary">
              ← 回首頁
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">我的短網址</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            + 創建短網址
          </button>
        </div>

        {links.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">還沒有任何短網址</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              創建第一個短網址
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
              <div key={link.slug} className="card flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-bold text-blue-600 hover:text-blue-700"
                    >
                      {link.shortUrl}
                    </a>
                    <button
                      onClick={() => copyToClipboard(link.shortUrl)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      📋 複製
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{link.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    目標：{link.url}
                  </p>
                  <p className="text-xs text-gray-400">
                    創建於：{new Date(link.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/analytics/${link.slug}`}
                    className="btn btn-secondary"
                  >
                    📊 分析
                  </Link>
                  <button
                    onClick={() => handleDelete(link.slug)}
                    className="btn btn-secondary text-red-600"
                  >
                    🗑️ 刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">創建短網址</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">目標網址</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={createData.url}
                  onChange={(e) => setCreateData({ ...createData, url: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  短網址代碼（可選）
                </label>
                <div className="flex gap-2">
                  <span className="px-4 py-2 bg-gray-100 rounded-lg">oao.to/</span>
                  <input
                    type="text"
                    placeholder="my-link（留空則自動生成隨機代碼）"
                    value={createData.slug}
                    onChange={(e) => setCreateData({ ...createData, slug: e.target.value })}
                    className="input flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 留空會自動生成像 "abc123" 這樣的隨機代碼
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">標題（可選）</label>
                <input
                  type="text"
                  placeholder="我的鏈接"
                  value={createData.title}
                  onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">
                  創建
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

