import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Plus, Copy, Trash2, Power, Key, Shield, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  rateLimit: {
    perMinute: number;
    perDay: number;
  };
  lastUsedAt?: number;
  totalRequests: number;
  createdAt: number;
  expiresAt?: number;
}

export default function ApiKeys() {
  const { token } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    name: '',
    environment: 'live' as 'live' | 'test',
    scopes: ['links:read', 'links:write'],
  });

  const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

  useEffect(() => {
    loadKeys().catch((error) => {
      console.error('[ApiKeys] Unhandled error:', error);
    });
  }, []);

  const loadKeys = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/account/keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setKeys(data.data.keys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/account/keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (res.ok) {
        setNewKey(data.data.key);
        setShowKeyModal(true);
        setShowCreateModal(false);
        loadKeys();

        // Reset form
        setCreateForm({
          name: '',
          environment: 'live',
          scopes: ['links:read', 'links:write'],
        });
      } else {
        alert(data.error || 'Failed to create API key');
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      alert('Failed to create API key');
    }
  };

  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    try {
      const res = await fetch(`${apiUrl}/api/account/keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        loadKeys();
      }
    } catch (error) {
      console.error('Failed to toggle API key:', error);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/account/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        loadKeys();
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            API Keys
          </h1>
          <p className="text-lg text-gray-500 font-medium max-w-2xl">
            Manage your API keys to access OAO.TO programmatically.
            Keep them safe and never share them client-side.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="shadow-xl shadow-orange-200/50 hover:shadow-2xl hover:shadow-orange-300/60 transition-all duration-300"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Key
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-white/50">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Key className="w-10 h-10 text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No API Keys Found</h3>
            <p className="text-gray-500 max-w-md mb-8">
              You haven't created any API keys yet. Create one to start building with OAO.TO.
            </p>
            <Button onClick={() => setShowCreateModal(true)} variant="secondary">
              Create Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {keys.map((key) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group"
              >
                <Card className={cn(
                  "border-l-4 overflow-hidden hover:shadow-lg transition-all duration-300",
                  key.isActive ? "border-l-green-500" : "border-l-gray-300 opacity-75"
                )}>
                  <div className="flex flex-col lg:flex-row lg:items-center">
                    {/* Key Info Area */}
                    <div className="flex-1 p-6 md:p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                          {key.name}
                          {key.keyPrefix.includes('test') ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                              TEST
                            </Badge>
                          ) : (
                            <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                              LIVE
                            </Badge>
                          )}
                        </h3>
                        <Badge variant={key.isActive ? 'outline' : 'destructive'} className="text-xs">
                          {key.isActive ? 'Active' : 'Revoked'}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 group-hover:border-gray-200 transition-colors">
                          <code className="text-sm font-mono text-gray-600">
                            {key.keyPrefix}••••••••••••••••
                          </code>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          Created {new Date(key.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Actions Area */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4 lg:gap-2 p-6 md:p-8 bg-gray-50/50 lg:bg-transparent lg:border-l lg:border-gray-100 lg:w-72 lg:flex-shrink-0">
                      <div className="flex items-center gap-6 lg:gap-8 mb-0 lg:mb-4 lg:w-full lg:justify-end">
                        <div className="text-center lg:text-right">
                          <div className="text-sm text-gray-500 mb-0.5">Requests</div>
                          <div className="font-bold text-gray-900">{key.totalRequests.toLocaleString()}</div>
                        </div>
                        <div className="text-center lg:text-right">
                          <div className="text-sm text-gray-500 mb-0.5">Limit/Day</div>
                          <div className="font-bold text-gray-900">{key.rateLimit.perDay.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleKey(key.id, key.isActive)}
                          className={cn("h-9", key.isActive ? "text-gray-500 hover:text-amber-600" : "text-green-600 hover:text-green-700")}
                        >
                          <Power className="w-4 h-4 mr-1.5" />
                          {key.isActive ? 'Revoke' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteKey(key.id)}
                          className="h-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Key Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New API Key"
        className="glass-panel"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Friendly Name
            </label>
            <Input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Production Server, Sidebar Widget..."
              className="bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Environment
              </label>
              <select
                value={createForm.environment}
                onChange={(e) => setCreateForm({ ...createForm, environment: e.target.value as 'live' | 'test' })}
                className="w-full h-12 px-4 rounded-2xl border-2 border-orange-50 bg-white text-base font-medium focus:outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all cursor-pointer hover:border-orange-200"
              >
                <option value="live">🚀 Live</option>
                <option value="test">🧪 Test (Sandbox)</option>
              </select>
            </div>

            <div className="flex items-center p-3 rounded-2xl bg-blue-50 text-blue-700 text-xs leading-relaxed">
              <div className="mr-2 flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              Live keys affect real data. Use Test keys for development.
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Permissions (Scopes)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'links:read', label: 'Read Links', desc: 'View link details' },
                { id: 'links:write', label: 'Create Links', desc: 'Create new short links' },
                { id: 'links:update', label: 'Update Links', desc: 'Modify existing links' },
                { id: 'links:delete', label: 'Delete Links', desc: 'Remove links permanently' },
                { id: 'analytics:read', label: 'Analytics', desc: 'Access link statistics' }
              ].map((scope) => (
                <label
                  key={scope.id}
                  className={cn(
                    "flex items-start p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-sm",
                    createForm.scopes.includes(scope.id)
                      ? "border-blue-400 bg-blue-50/50"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={createForm.scopes.includes(scope.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCreateForm({ ...createForm, scopes: [...createForm.scopes, scope.id] });
                      } else {
                        setCreateForm({ ...createForm, scopes: createForm.scopes.filter((s) => s !== scope.id) });
                      }
                    }}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        createForm.scopes.includes(scope.id) ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white"
                      )}>
                        {createForm.scopes.includes(scope.id) && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white"><div className="w-2 h-2 bg-white rounded-full" /></motion.div>}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{scope.label}</span>
                    </div>
                    <span className="text-xs text-gray-500 ml-6 block">{scope.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={!createForm.name || createForm.scopes.length === 0}>
              Create API Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Show New Key Modal */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => {
          setShowKeyModal(false);
          setNewKey('');
        }}
        title="API Key Created Successfully"
        className="glass-panel"
      >
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-2 border-green-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Save your key safely!</h4>
            <p className="text-sm text-gray-600">
              This key will only be shown once. If you lose it, you'll need to generate a new one.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Your API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={newKey}
                  readOnly
                  className="font-mono text-sm pr-12 bg-gray-50 border-gray-200"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <Key className="w-5 h-5" />
                </div>
              </div>
              <Button onClick={() => copyToClipboard(newKey)} className="flex-shrink-0" variant="secondary">
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={() => {
              setShowKeyModal(false);
              setNewKey('');
            }} className="w-full">
              I have saved my key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
