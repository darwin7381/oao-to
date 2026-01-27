import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, User, Calendar, Shield, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { adminApi, type AuditLog } from '../../lib/adminApi';

export default function AuditLogDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [log, setLog] = useState<AuditLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadLog().catch((error) => {
                console.error('[AuditLogDetail] Error:', error);
            });
        }
    }, [id, token]);

    const loadLog = async () => {
        if (!token || !id) return;

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getAuditLog(id);
            setLog(data.data.log);
        } catch (err: any) {
            console.error('Failed to load audit log:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('delete')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('create')) return 'bg-green-100 text-green-700 border-green-200';
        if (action.includes('update') || action.includes('adjust')) return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !log) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-red-500 text-xl mb-4">載入失敗</div>
                <div className="text-gray-600 mb-4">{error || '找不到日誌'}</div>
                <Button onClick={() => navigate('/admin/audit-logs')}>返回列表</Button>
            </div>
        );
    }

    const oldValue = log.old_value ? JSON.parse(log.old_value) : null;
    const newValue = log.new_value ? JSON.parse(log.new_value) : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link to="/admin/audit-logs" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-semibold">返回日誌列表</span>
                </Link>
                <Badge className={cn('border', getActionColor(log.action))}>
                    {log.action}
                </Badge>
            </div>

            {/* Basic Info */}
            <Card className="border-0 shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        操作詳情
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm font-semibold text-gray-500 mb-1">操作者</div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold">{log.user_email}</span>
                                <Badge variant="outline" className="text-xs">{log.user_role}</Badge>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-500 mb-1">時間</div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-sm font-semibold text-gray-500 mb-1">資源類型</div>
                        <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded border">
                            {log.resource_type} {log.resource_id && `/ ${log.resource_id}`}
                        </div>
                    </div>

                    {log.ip_address && (
                        <div>
                            <div className="text-sm font-semibold text-gray-500 mb-1">IP 地址</div>
                            <div className="font-mono text-sm">{log.ip_address}</div>
                        </div>
                    )}

                    {log.user_agent && (
                        <div>
                            <div className="text-sm font-semibold text-gray-500 mb-1">User Agent</div>
                            <div className="text-sm text-gray-600 break-all">{log.user_agent}</div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Data Changes */}
            {(oldValue || newValue) && (
                <Card className="border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            數據變更
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Before */}
                            <div>
                                <div className="text-sm font-bold text-gray-500 mb-2">Before</div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <pre className="text-xs text-gray-800 overflow-auto">
                                        {JSON.stringify(oldValue, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            {/* After */}
                            <div>
                                <div className="text-sm font-bold text-gray-500 mb-2">After</div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <pre className="text-xs text-gray-800 overflow-auto">
                                        {JSON.stringify(newValue, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
