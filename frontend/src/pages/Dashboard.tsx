import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { type Link as LinkType } from '../lib/api';
import UserMenu from '../components/UserMenu';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { Plus, Search, ExternalLink, BarChart2, Trash2, Calendar, Link as LinkIcon, QrCode, Copy } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [createData, setCreateData] = useState({ url: '', slug: '', title: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

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
      : 'http://localhost:8787';

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
    setCreateLoading(true);

    const apiUrl = import.meta.env.PROD
      ? 'https://api.oao.to/shorten'
      : 'http://localhost:8788/shorten';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: createData.url,
          customSlug: createData.slug || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Creation failed');
      }

      const data = await response.json();
      setShowCreateModal(false);
      setCreateData({ url: '', slug: '', title: '' });
      loadLinks();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    setLinks(links.filter(l => l.slug !== slug));
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredLinks = links.filter(link =>
    link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Vibrant Blobs for Dashboard Glass Effect */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" />
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-orange-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-orange-400 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-orange-200">
              O
            </div>
            <span className="text-xl font-black text-gray-800">
              OAO.TO
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black text-gray-800 mb-2">My Links</h1>
            <p className="text-gray-500 font-medium">Manage and track your cute shortcuts.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="lg" className="rounded-2xl shadow-xl shadow-orange-200">
            <Plus className="w-5 h-5 mr-2" />
            Create New
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white border-2 border-orange-50 hover:border-orange-200 transition-all p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-100/50 text-orange-500 rounded-2xl">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Links</p>
                <p className="text-3xl font-black text-gray-800">{links.length}</p>
              </div>
            </div>
          </Card>
          {/* Placeholders for other stats */}
          <Card className="bg-white border-2 border-blue-50 hover:border-blue-200 transition-all p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-100/50 text-blue-500 rounded-2xl">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Clicks</p>
                <p className="text-3xl font-black text-gray-800">-</p>
              </div>
            </div>
          </Card>
          <Card className="bg-white border-2 border-pink-50 hover:border-pink-200 transition-all p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-pink-100/50 text-pink-500 rounded-2xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">This Month</p>
                <p className="text-3xl font-black text-gray-800">-</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search your links..."
            className="pl-12 bg-white/80 h-14"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Links List */}
        {loading ? (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="animate-spin w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full mb-4" />
            <p className="text-gray-400 font-medium">Loading your awesomeness...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-[3rem] border border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-orange-50 mb-6 rotate-6">
              <LinkIcon className="w-10 h-10 text-orange-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No links yet!</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Your collection is empty. Let's create something useful and cute.</p>
            <Button variant="outline" onClick={() => setShowCreateModal(true)}>
              Create First Link
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLinks.map((link) => (
              <Card key={link.slug} className="group border-2 border-transparent hover:border-orange-100 transition-all px-0 py-0 overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row items-center gap-6">

                  {/* Icon */}
                  <div className="hidden md:flex flex-shrink-0 w-16 h-16 bg-gray-50 rounded-2xl items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                    <ExternalLink className="w-6 h-6" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-center md:text-left w-full">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                      <a href={link.shortUrl} target="_blank" rel="noreferrer" className="font-black text-xl text-gray-800 hover:text-orange-500 truncate transition-colors">
                        {link.shortUrl.replace(/^https?:\/\//, '')}
                      </a>
                      <button onClick={() => copyLink(link.shortUrl)} className="hidden md:block p-1 text-gray-300 hover:text-orange-400 transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 truncate max-w-2xl font-medium mb-3">
                      {link.url}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-4">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(link.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setShowQRModal(link.shortUrl)}
                      className="text-gray-500 hover:text-gray-700 bg-white border-2 border-gray-100 hover:border-gray-200"
                      title="Show QR Code"
                    >
                      <QrCode className="w-5 h-5" />
                    </Button>
                    <Link to={`/analytics/${link.slug}`} className="flex-1 md:flex-none">
                      <Button variant="secondary" className="w-full bg-white border-2 border-gray-100 hover:border-blue-200 hover:text-blue-600">
                        <BarChart2 className="w-4 h-4 mr-2" />
                        Stats
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(link.slug)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>

                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Link"
      >
        <form onSubmit={handleCreate} className="space-y-6 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Destination URL</label>
            <Input
              autoFocus
              required
              placeholder="https://example.com/long-url"
              value={createData.url}
              onChange={(e) => setCreateData({ ...createData, url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Custom Slug (Optional)</label>
            <div className="flex rounded-2xl shadow-sm">
              <span className="inline-flex items-center px-5 rounded-l-2xl border-2 border-r-0 border-orange-50 bg-orange-50/50 text-orange-400 font-bold text-sm">
                oao.to/
              </span>
              <Input
                className="rounded-l-none border-l-0"
                placeholder="cute-name"
                value={createData.slug}
                onChange={(e) => setCreateData({ ...createData, slug: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLoading} className="flex-1">
              {createLoading ? 'Working...' : 'Create Link'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Modal */}
      <Modal
        isOpen={!!showQRModal}
        onClose={() => setShowQRModal(null)}
        title="QR Code"
      >
        {showQRModal && (
          <div className="flex justify-center pb-4">
            <QRCodeGenerator url={showQRModal} size={250} />
          </div>
        )}
      </Modal>
    </div>
  );
}
