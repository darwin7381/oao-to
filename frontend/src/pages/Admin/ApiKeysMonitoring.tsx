import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { motion } from 'framer-motion';
import {
    Key,
    Search,
    Ban,
    AlertTriangle,
    Activity,
    User,
    Calendar,
    TrendingUp,
    Zap,
    Shield,
    XCircle,
    CheckCircle,
    Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { adminApi, type AdminApiKey } from '../../lib/adminApi';

export default function AdminApiKeysMonitoring() {
    const { token } = useAuth();
    const [apiKeys, setApiKeys] = useState<AdminApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKey, setSelectedKey] = useState<AdminApiKey | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showRevokeModal, setShowRevokeModal] = useState(false);

    useEffect(() => {
        loadApiKeys().catch((error) => {
            console.error('[ApiKeys] Unhandled error:', error);
        });
    }, [token]);

    const loadApiKeys = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getApiKeys();
            setApiKeys(data.data.keys);
        } catch (err: any) {
            console.error('Failed to load API keys:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const displayKeys = apiKeys;

    const handleRevokeKey = async () => {
        if (!selectedKey) return;

        try {
            await adminApi.revokeApiKey(selectedKey.id);
            await loadApiKeys();
            setShowRevokeModal(false);
            setShowDetailsModal(false);
        } catch (err: any) {
            console.error('Failed to revoke key:', err);
            alert(`撤銷失敗：${err.message}`);
        }
    };

    const filteredKeys = (displayKeys || []).filter(key => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            (key.user_email || '').toLowerCase().includes(query) ||
            (key.name || '').toLowerCase().includes(query) ||
            (key.key_prefix || '').toLowerCase().includes(query)
        );
    });

    const totalRequests = displayKeys.reduce((sum, key) => sum + (key.totalRequests || 0), 0);
    const activeKeys = displayKeys.filter(k => k.is_active).length;
    const suspiciousKeys = displayKeys.filter(k => ((k.errorRate || 0) > 20 || (k.rateLimitHits || 0) > 100)).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">API Keys Monitoring</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                    Monitor API usage, detect abuse, and manage access control
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Total Keys</span>
                            <Key className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {displayKeys.length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-semibold">
                            {activeKeys} active
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Total Requests</span>
                            <Zap className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {(totalRequests / 1000).toFixed(1)}K
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-semibold">
                            All time
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Today's Requests</span>
                            <Activity className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {(displayKeys || []).reduce((sum, k) => sum + (k.requestsToday || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Suspicious</span>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-3xl font-black text-red-600">
                            {suspiciousKeys}
                        </div>
                        <div className="text-xs text-red-500 mt-1 font-semibold">
                            Needs attention
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by user, key name, or prefix..."
                                className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="border-gray-200">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* API Keys Table */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-blue-500" />
                        API Keys ({filteredKeys.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Key Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Prefix
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Requests
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Rate Hits
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Error Rate
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredKeys.map((key, index) => {
                                    const isSuspicious = (key.errorRate || 0) > 20 || (key.rateLimitHits || 0) > 100;
                                    
                                    return (
                                        <motion.tr
                                            key={key.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.03 }}
                                            className={cn(
                                                "hover:bg-blue-50/30 transition-colors",
                                                isSuspicious && "bg-red-50/30"
                                            )}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    <div className="font-semibold text-gray-900">{key.user_email}</div>
                                                    <div className="text-xs text-gray-500">{key.user_id}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900">{key.name || 'Unnamed'}</span>
                                                    {key.key_prefix?.includes('test') && (
                                                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                                                            TEST
                                                        </Badge>
                                                    )}
                                                    {key.key_prefix?.includes('live') && (
                                                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                                            LIVE
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                    {key.key_prefix}...
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="font-bold text-gray-900">
                                                    {(key.totalRequests || 0).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500 font-semibold">
                                                    +{key.requestsToday} today
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={cn(
                                                    "font-bold",
                                                    (key.rateLimitHits || 0) > 100 ? "text-red-600" : "text-gray-900"
                                                )}>
                                                    {key.rateLimitHits || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={cn(
                                                    "font-bold",
                                                    (key.errorRate || 0) > 20 ? "text-red-600" :
                                                    (key.errorRate || 0) > 10 ? "text-yellow-600" : "text-green-600"
                                                )}>
                                                    {(key.errorRate || 0).toFixed(1)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {key.isActive ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Revoked
                                                    </Badge>
                                                )}
                                                {isSuspicious && (
                                                    <Badge className="bg-red-100 text-red-700 border-red-200 ml-1">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Alert
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedKey(key);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="text-blue-600 hover:bg-blue-50"
                                                    >
                                                        Details
                                                    </Button>
                                                    {key.isActive && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedKey(key);
                                                                setShowRevokeModal(true);
                                                            }}
                                                            className="text-red-600 hover:bg-red-50"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="API Key Details"
            >
                {selectedKey ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Key className="w-5 h-5 text-blue-600" />
                                    <span className="font-bold text-blue-900">{selectedKey.name}</span>
                                </div>
                                <Badge className={(selectedKey.keyPrefix?.includes('live')) ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}>
                                    {selectedKey.keyPrefix?.includes('live') ? 'LIVE' : 'TEST'}
                                </Badge>
                            </div>
                            <code className="text-xs font-mono text-gray-600 block bg-white px-3 py-2 rounded border border-blue-200">
                                {selectedKey.keyPrefix}••••••••••••••••
                            </code>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1 font-semibold">Total Requests</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {(selectedKey.totalRequests || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1 font-semibold">Today</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {(selectedKey.requestsToday || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1 font-semibold">Rate Limit Hits</div>
                                <div className={cn(
                                    "text-2xl font-bold",
                                    (selectedKey.rateLimitHits || 0) > 100 ? "text-red-600" : "text-gray-900"
                                )}>
                                    {selectedKey.rateLimitHits || 0}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1 font-semibold">Error Rate</div>
                                <div className={cn(
                                    "text-2xl font-bold",
                                    (selectedKey.errorRate || 0) > 20 ? "text-red-600" : "text-green-600"
                                )}>
                                    {(selectedKey.errorRate || 0).toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-xs text-gray-500 mb-2 font-semibold">Owner</div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-gray-900">{selectedKey.user_email}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-xs text-gray-500 mb-2 font-semibold">Scopes</div>
                            <div className="flex flex-wrap gap-2">
                                {(typeof selectedKey.scopes === 'string' ? selectedKey.scopes.split(',') : selectedKey.scopes || []).map(scope => (
                                    <Badge key={scope} className="bg-blue-50 text-blue-700 border-blue-200">
                                        {scope}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {(selectedKey.errorRate || 0) > 20 && (
                            <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <span className="font-bold text-red-900">High Error Rate Detected</span>
                                </div>
                                <p className="text-sm text-red-700">
                                    This key has an unusually high error rate. Consider investigating for abuse.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <Button
                                variant="outline"
                                onClick={() => setShowDetailsModal(false)}
                                className="flex-1"
                            >
                                Close
                            </Button>
                            {selectedKey.isActive && (
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setShowRevokeModal(true);
                                    }}
                                    className="flex-1"
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Revoke Key
                                </Button>
                            )}
                        </div>
                    </div>
                ) : null}
            </Modal>

            
            <Modal
                isOpen={showRevokeModal}
                onClose={() => setShowRevokeModal(false)}
                title="Revoke API Key?"
            >
                {selectedKey && (
                    <div className="space-y-6">
                        <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <span className="font-bold text-red-900">This action is permanent</span>
                            </div>
                            <p className="text-sm text-red-700">
                                The user will immediately lose API access. This cannot be undone.
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-xs text-gray-500 mb-2">Key to revoke:</div>
                            <code className="text-sm font-mono text-gray-900 font-bold">
                                {selectedKey.keyPrefix}...
                            </code>
                            <div className="text-xs text-gray-500 mt-2">
                                Owner: {selectedKey.user_email}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setShowRevokeModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRevokeKey}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                <Ban className="w-4 h-4 mr-2" />
                                Revoke Now
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
