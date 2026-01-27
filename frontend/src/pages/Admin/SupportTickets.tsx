import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Headphones, User, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { adminApi, type SupportTicket } from '../../lib/adminApi';

export default function SupportTickets() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        loadTickets().catch((error) => {
            console.error('[SupportTickets] Unhandled error:', error);
        });
    }, [token]);

    const loadTickets = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getSupportTickets();
            setTickets(data.data.tickets);
        } catch (err: any) {
            console.error('Failed to load tickets:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const config: any = {
            open: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Open' },
            in_progress: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'In Progress' },
            resolved: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Resolved' },
            closed: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Closed' },
        };
        const cfg = config[status] || config.open;
        return <Badge className={cn('border', cfg.color)}>{cfg.label}</Badge>;
    };

    const filteredTickets = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Support Tickets</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">Manage customer support requests and inquiries</p>
            </div>

            <div className="flex gap-2">
                {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                            'px-4 py-2 rounded-xl font-semibold text-sm transition-all capitalize',
                            filterStatus === status
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        )}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl">
                <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Headphones className="w-5 h-5 text-blue-500" />
                        Tickets ({filteredTickets.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {filteredTickets.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Headphones className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No support tickets found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTickets.map((ticket) => (
                                <div key={ticket.id} className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStatusBadge(ticket.status)}
                                                <Badge variant="outline" className="text-xs">{ticket.priority}</Badge>
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-1">{ticket.title}</h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5" />
                                                    {ticket.user_email}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(ticket.created_at).toLocaleDateString()}
                                                </span>
                                                {ticket.assigned_to_email && (
                                                    <span className="text-blue-600 font-semibold">→ {ticket.assigned_to_email}</span>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => navigate(`/admin/support/${ticket.id}`)}
                                        >
                                            View
                                        </Button>
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
