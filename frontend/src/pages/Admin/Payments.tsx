import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { motion } from 'framer-motion';
import {
    DollarSign,
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Download,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface Payment {
    id: string;
    user_id: string;
    user_email: string;
    amount: number;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    plan: string;
    credits: number;
    payment_method: string;
    created_at: string;
    stripe_payment_id?: string;
}

export default function AdminPayments() {
    const { token } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            const res = await fetch(`${apiUrl}/admin/payments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setPayments(data.data.payments);
            }
        } catch (error) {
            console.error('Failed to load payments:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock data if API not ready
    const mockPayments: Payment[] = [
        {
            id: 'pay_1',
            user_id: 'user_123',
            user_email: 'john@example.com',
            amount: 29.99,
            status: 'completed',
            plan: 'Pro Monthly',
            credits: 10000,
            payment_method: 'Stripe',
            created_at: new Date().toISOString(),
            stripe_payment_id: 'pi_abc123'
        },
        {
            id: 'pay_2',
            user_id: 'user_456',
            user_email: 'jane@example.com',
            amount: 99.99,
            status: 'pending',
            plan: 'Enterprise',
            credits: 50000,
            payment_method: 'Stripe',
            created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: 'pay_3',
            user_id: 'user_789',
            user_email: 'bob@example.com',
            amount: 9.99,
            status: 'failed',
            plan: 'Starter',
            credits: 1000,
            payment_method: 'Stripe',
            created_at: new Date(Date.now() - 7200000).toISOString(),
        },
    ];

    const displayPayments = payments.length > 0 ? payments : mockPayments;

    const getStatusBadge = (status: Payment['status']) => {
        const config = {
            completed: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
            pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
            failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
            refunded: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: RefreshCw },
        };

        const { color, icon: Icon } = config[status];

        return (
            <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border', color)}>
                <Icon className="w-3 h-3" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
        );
    };

    const filteredPayments = displayPayments.filter(payment => {
        if (filter !== 'all' && payment.status !== filter) return false;
        if (searchQuery && !payment.user_email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const totalRevenue = displayPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Payment Management</h1>
                    <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                    <p className="text-lg text-gray-500 font-medium">
                        Monitor transactions, process refunds, and manage billing
                    </p>
                </div>
                <Button colorScheme="blue">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Revenue"
                    value={`$${totalRevenue.toFixed(2)}`}
                    subtext="Lifetime earnings"
                    icon={DollarSign}
                    color="green"
                    delay={0.1}
                />
                <StatsCard
                    title="Completed"
                    value={displayPayments.filter(p => p.status === 'completed').length.toString()}
                    subtext="Transactions"
                    icon={CheckCircle}
                    color="blue"
                    delay={0.2}
                />
                <StatsCard
                    title="Pending"
                    value={displayPayments.filter(p => p.status === 'pending').length.toString()}
                    subtext="Awaiting processing"
                    icon={Clock}
                    color="yellow"
                    delay={0.3}
                />
                <StatsCard
                    title="Failed"
                    value={displayPayments.filter(p => p.status === 'failed').length.toString()}
                    subtext="Action required"
                    icon={XCircle}
                    color="red"
                    delay={0.4}
                />
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by email..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                            {(['all', 'completed', 'pending', 'failed', 'refunded'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={cn(
                                        'px-4 py-2 rounded-lg font-bold text-xs transition-all',
                                        filter === status
                                            ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                    )}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        Recent Transactions ({filteredPayments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredPayments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <CreditCard className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No payments found</h3>
                            <p className="text-gray-500">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Plan
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Credits
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPayments.map((payment, index) => (
                                        <motion.tr
                                            key={payment.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-blue-50/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-bold text-gray-900">
                                                        {payment.user_email}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-medium">
                                                        ID: {payment.user_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="font-semibold bg-gray-100 text-gray-700 border-gray-200">
                                                    {payment.plan}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-gray-900">
                                                    ${payment.amount.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-blue-600">
                                                    +{payment.credits.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(payment.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600 font-medium">
                                                    {new Date(payment.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    colorScheme="blue"
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    View Details
                                                </Button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const StatsCard = ({ title, value, subtext, icon: Icon, color, delay }: any) => {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-green-50 text-green-600 border-green-100",
        yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
        red: "bg-red-50 text-red-600 border-red-100",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow"
        >
            <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</div>
                <div className="text-3xl font-black text-gray-900 mb-1">{value}</div>
                <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">{subtext}</div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorStyles[color as keyof typeof colorStyles]}`}>
                <Icon className="w-6 h-6" />
            </div>
        </motion.div>
    );
}
