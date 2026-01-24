import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Plus,
    Minus,
    Search,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface UserCredit {
    user_id: string;
    email: string;
    name: string;
    total_credits: number;
    subscription_credits: number;
    purchased_credits: number;
    plan: string;
    last_transaction_at?: string;
}

interface Transaction {
    id: string;
    user_id: string;
    type: 'add' | 'deduct' | 'purchase' | 'subscription';
    amount: number;
    reason: string;
    admin_id?: string;
    created_at: string;
}

export default function AdminCreditsManagement() {
    const { token } = useAuth();
    const [users, setUsers] = useState<UserCredit[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserCredit | null>(null);
    const [adjustForm, setAdjustForm] = useState({
        amount: '',
        type: 'add' as 'add' | 'deduct',
        reason: ''
    });

    const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, txRes] = await Promise.all([
                fetch(`${apiUrl}/admin/credits/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/admin/credits/transactions?limit=50`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.data.users);
            }

            if (txRes.ok) {
                const data = await txRes.json();
                setTransactions(data.data.transactions);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock data
    const mockUsers: UserCredit[] = [
        {
            user_id: 'user_1',
            email: 'john@example.com',
            name: 'John Doe',
            total_credits: 5000,
            subscription_credits: 3000,
            purchased_credits: 2000,
            plan: 'Pro',
            last_transaction_at: new Date().toISOString()
        },
        {
            user_id: 'user_2',
            email: 'jane@example.com',
            name: 'Jane Smith',
            total_credits: 1000,
            subscription_credits: 1000,
            purchased_credits: 0,
            plan: 'Starter',
            last_transaction_at: new Date(Date.now() - 86400000).toISOString()
        },
    ];

    const mockTransactions: Transaction[] = [
        {
            id: 'tx_1',
            user_id: 'user_1',
            type: 'add',
            amount: 500,
            reason: 'Customer compensation',
            admin_id: 'admin_1',
            created_at: new Date().toISOString()
        },
        {
            id: 'tx_2',
            user_id: 'user_2',
            type: 'purchase',
            amount: 1000,
            reason: 'Starter plan purchase',
            created_at: new Date(Date.now() - 3600000).toISOString()
        },
    ];

    const displayUsers = users.length > 0 ? users : mockUsers;
    const displayTransactions = transactions.length > 0 ? transactions : mockTransactions;

    const handleAdjustCredits = async () => {
        if (!selectedUser) return;

        try {
            const res = await fetch(`${apiUrl}/admin/credits/adjust`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: selectedUser.user_id,
                    type: adjustForm.type,
                    amount: parseInt(adjustForm.amount),
                    reason: adjustForm.reason
                })
            });

            if (res.ok) {
                setShowAdjustModal(false);
                setAdjustForm({ amount: '', type: 'add', reason: '' });
                loadData();
            } else {
                alert('Failed to adjust credits');
            }
        } catch (error) {
            console.error('Failed to adjust credits:', error);
            alert('Failed to adjust credits');
        }
    };

    const filteredUsers = displayUsers.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalCredits = displayUsers.reduce((sum, user) => sum + user.total_credits, 0);

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
                <h1 className="text-4xl font-black text-gray-900 mb-3">Credits Management</h1>
                <p className="text-lg text-gray-600 font-medium">
                    Monitor and manually adjust user credit balances
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="w-6 h-6 opacity-80" />
                            <span className="text-sm opacity-90 font-semibold">Total Credits</span>
                        </div>
                        <div className="text-3xl font-black">
                            {totalCredits.toLocaleString()}
                        </div>
                        <div className="text-xs opacity-75 mt-1">
                            Across all users
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Active Users</span>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {displayUsers.length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Recent Adjustments</span>
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {displayTransactions.filter(t => t.admin_id).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users by email or name..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-purple-500" />
                            User Credits ({filteredUsers.length})
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
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
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Total Credits
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Subscription
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Purchased
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.map((user, index) => (
                                    <motion.tr
                                        key={user.user_id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-semibold text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="font-semibold">
                                                {user.plan}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-gray-900 text-lg">
                                                {user.total_credits.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm text-blue-600 font-semibold">
                                                {user.subscription_credits.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm text-green-600 font-semibold">
                                                {user.purchased_credits.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowAdjustModal(true);
                                                }}
                                            >
                                                Adjust
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                        Recent Adjustments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {displayTransactions.slice(0, 10).map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        tx.type === 'add' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                    )}>
                                        {tx.type === 'add' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{tx.reason}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(tx.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "font-bold text-lg",
                                    tx.type === 'add' ? "text-green-600" : "text-red-600"
                                )}>
                                    {tx.type === 'add' ? '+' : '-'}{tx.amount.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Adjust Credits Modal */}
            <Modal
                isOpen={showAdjustModal}
                onClose={() => {
                    setShowAdjustModal(false);
                    setAdjustForm({ amount: '', type: 'add', reason: '' });
                }}
                title="Adjust Credits"
            >
                {selectedUser && (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600" />
                                <div>
                                    <div className="font-semibold text-blue-900">{selectedUser.name}</div>
                                    <div className="text-sm text-blue-700">
                                        Current balance: <span className="font-bold">{selectedUser.total_credits.toLocaleString()}</span> credits
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Adjustment Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAdjustForm({ ...adjustForm, type: 'add' })}
                                    className={cn(
                                        "p-4 rounded-xl border-2 font-semibold transition-all",
                                        adjustForm.type === 'add'
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <Plus className="w-5 h-5 mx-auto mb-1" />
                                    Add Credits
                                </button>
                                <button
                                    onClick={() => setAdjustForm({ ...adjustForm, type: 'deduct' })}
                                    className={cn(
                                        "p-4 rounded-xl border-2 font-semibold transition-all",
                                        adjustForm.type === 'deduct'
                                            ? "border-red-500 bg-red-50 text-red-700"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <Minus className="w-5 h-5 mx-auto mb-1" />
                                    Deduct Credits
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Amount
                            </label>
                            <Input
                                type="number"
                                value={adjustForm.amount}
                                onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                                placeholder="Enter amount..."
                                className="text-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Reason
                            </label>
                            <textarea
                                value={adjustForm.reason}
                                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                placeholder="Explain why you're making this adjustment..."
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setShowAdjustModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAdjustCredits}
                                disabled={!adjustForm.amount || !adjustForm.reason}
                                className={cn(
                                    "flex-1",
                                    adjustForm.type === 'add' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                                )}
                            >
                                {adjustForm.type === 'add' ? 'Add' : 'Deduct'} Credits
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
