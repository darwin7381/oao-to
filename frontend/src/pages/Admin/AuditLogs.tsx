import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Shield, Search, User, Clock, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { adminApi, type AuditLog } from '../../lib/adminApi';

export default function AuditLogs() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [filterResource, setFilterResource] = useState<string>('all');

    useEffect(() => {
        loadLogs().catch((error) => {
            console.error('[AuditLogs] Unhandled error:', error);
        });
    }, [token]);

    const loadLogs = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getAuditLogs({ limit: 100 });
            setLogs(data.data.logs);
        } catch (err: any) {
            console.error('Failed to load audit logs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('delete')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('create')) return 'bg-green-100 text-green-700 border-green-200';
        if (action.includes('update')) return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const filteredLogs = logs.filter(log => {
        // 搜尋篩選
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!(log.user_email || '').toLowerCase().includes(query) && 
                !(log.action || '').toLowerCase().includes(query)) {
                return false;
            }
        }
        
        // 操作類型篩選
        if (filterAction !== 'all' && log.action !== filterAction) {
            return false;
        }
        
        // 資源類型篩選
        if (filterResource !== 'all' && log.resource_type !== filterResource) {
            return false;
        }
        
        return true;
    });

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-red-500 text-xl mb-4">載入失敗</div>
                <div className="text-gray-600 mb-4">{error}</div>
                <button 
                    onClick={() => loadLogs()} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    重試
                </button>
            </div>
        );
    }

    // 獲取所有唯一的操作類型（在 loading 之後）
    const actionTypes = logs && logs.length > 0 ? [...new Set(logs.map(l => l.action))] : [];
    const resourceTypes = logs && logs.length > 0 ? [...new Set(logs.map(l => l.resource_type))] : [];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Audit Logs</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">Track all administrative actions and system events</p>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl">
                <CardContent className="p-6 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by email or action..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <div className="text-xs font-bold text-gray-500 mb-2">操作類型</div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilterAction('all')}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                        filterAction === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    全部
                                </button>
                                {actionTypes.map(action => (
                                    <button
                                        key={action}
                                        onClick={() => setFilterAction(action)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                            filterAction === action
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        )}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-gray-500 mb-2">資源類型</div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilterResource('all')}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                        filterResource === 'all'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    全部
                                </button>
                                {resourceTypes.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterResource(type)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                            filterResource === type
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl">
                <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        Activity Log ({filteredLogs.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No audit logs found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-gray-900">{log.user_email}</span>
                                                    <Badge className="text-xs">{log.user_role}</Badge>
                                                    <Badge className={getActionBadgeColor(log.action)}>{log.action}</Badge>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {log.resource_type} {log.resource_id && `· ${log.resource_id}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                            <button
                                                onClick={() => navigate(`/admin/audit-logs/${log.id}`)}
                                                className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                詳情
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
