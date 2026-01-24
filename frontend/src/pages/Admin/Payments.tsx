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
    Filter,
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
                    <h1 className="text-4xl font-black text-gray-900 mb-3">Payment Management</h1>
                    <p className="text-lg text-gray-600 font-medium">
                        Monitor transactions, process refunds, and manage billing
                    </p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-6 h-6 opacity-80" />
                            <span className="text-sm opacity-90 font-semibold">Total Revenue</span>
                        </div>
                        <div className="text-3xl font-black">
                            ${totalRevenue.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Completed</span>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {displayPayments.filter(p => p.status === 'completed').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Pending</span>
                            <Clock className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {displayPayments.filter(p => p.status === 'pending').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Failed</span>
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {displayPayments.filter(p => p.status === 'failed').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by email..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'completed', 'pending', 'failed', 'refunded'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={cn(
                                        'px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                                        filter === status
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        Recent Transactions ({filteredPayments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredPayments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No payments found matching your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Plan
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Credits
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredPayments.map((payment, index) => (
                                        <motion.tr
                                            key={payment.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-semibold text-gray-900">
                                                        {payment.user_email}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        ID: {payment.user_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="font-semibold">
                                                    {payment.plan}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">
                                                    ${payment.amount.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-blue-600">
                                                    +{payment.credits.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(payment.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600">
                                                    {new Date(payment.created_at).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
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
