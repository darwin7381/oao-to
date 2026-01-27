import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, User, Calendar, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { adminApi, type SupportTicket, type TicketMessage } from '../../lib/adminApi';

export default function SupportTicketDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (id) {
            loadTicket().catch((error) => {
                console.error('[TicketDetail] Error:', error);
            });
        }
    }, [id, token]);

    const loadTicket = async () => {
        if (!token || !id) return;

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getSupportTicket(id);
            setTicket(data.data.ticket);
            setMessages(data.data.messages);
        } catch (err: any) {
            console.error('Failed to load ticket:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!id || !replyText.trim()) return;

        setSending(true);
        try {
            await adminApi.replyToTicket(id, replyText);
            setReplyText('');
            await loadTicket();
        } catch (err: any) {
            console.error('Failed to send reply:', err);
            alert(`回覆失敗：${err.message}`);
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!id) return;

        try {
            await adminApi.updateSupportTicket(id, { status: newStatus });
            await loadTicket();
        } catch (err: any) {
            console.error('Failed to update status:', err);
            alert(`更新狀態失敗：${err.message}`);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: any = {
            open: 'bg-blue-100 text-blue-700 border-blue-200',
            in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            resolved: 'bg-green-100 text-green-700 border-green-200',
            closed: 'bg-gray-100 text-gray-700 border-gray-200',
        };
        return colors[status] || colors.open;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-red-500 text-xl mb-4">載入失敗</div>
                <div className="text-gray-600 mb-4">{error || '找不到工單'}</div>
                <Button onClick={() => navigate('/admin/support')}>返回列表</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link to="/admin/support" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-semibold">返回工單列表</span>
                </Link>
                <Badge className={cn('border', getStatusColor(ticket.status))}>
                    {ticket.status.replace('_', ' ').toUpperCase()}
                </Badge>
            </div>

            {/* Ticket Info */}
            <Card className="border-0 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {ticket.user_email}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(ticket.created_at).toLocaleString()}
                        </span>
                        <Badge variant="outline">{ticket.priority}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* Status Actions */}
                    <div className="mt-6 flex gap-2">
                        <Button
                            size="sm"
                            variant={ticket.status === 'in_progress' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange('in_progress')}
                        >
                            處理中
                        </Button>
                        <Button
                            size="sm"
                            variant={ticket.status === 'resolved' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange('resolved')}
                        >
                            已解決
                        </Button>
                        <Button
                            size="sm"
                            variant={ticket.status === 'closed' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange('closed')}
                        >
                            關閉
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Messages */}
            <Card className="border-0 shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        對話記錄 ({messages.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    'p-4 rounded-lg',
                                    msg.user_role === 'admin' || msg.user_role === 'superadmin'
                                        ? 'bg-blue-50 border border-blue-100'
                                        : 'bg-gray-50 border border-gray-100'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900">
                                        {msg.user_role === 'admin' || msg.user_role === 'superadmin' ? 'Admin' : 'User'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(msg.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                            </div>
                        ))}
                    </div>

                    {/* Reply Box */}
                    <div className="mt-6">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="輸入回覆..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none"
                            rows={4}
                        />
                        <div className="mt-3 flex justify-end">
                            <Button
                                onClick={handleReply}
                                disabled={!replyText.trim() || sending}
                                colorScheme="blue"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {sending ? '發送中...' : '發送回覆'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
