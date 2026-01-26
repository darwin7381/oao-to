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
    RefreshCw,
    AlertCircle,
    Wallet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { adminApi, type UserCredit, type CreditTransaction } from '../../lib/adminApi';

export default function AdminCreditsManagement() {
    const { token } = useAuth();
    const [users, setUsers] = useState<UserCredit[]>([]);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserCredit | null>(null);
    const [adjustForm, setAdjustForm] = useState({
        amount: '',
        type: 'add' as 'add' | 'deduct',
        reason: ''
    });

    useEffect(() => {
        loadData().catch((error) => {
            console.error('[Credits] Unhandled error:', error);
        });
    }, [token]);

    const loadData = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const [usersData, txData] = await Promise.all([
                adminApi.getCreditUsers(),
                adminApi.getCreditTransactions(50),
            ]);

            setUsers(usersData.data.users);
            setTransactions(txData.data.transactions);
        } catch (err: any) {
            console.error('Failed to load data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const displayUsers = users;
    const displayTransactions = transactions;

    const handleAdjustCredits = async () => {
        if (!selectedUser) return;

        try {
            await adminApi.adjustCredits({
                user_id: selectedUser.user_id,
                type: adjustForm.type,
                amount: parseInt(adjustForm.amount),
                reason: adjustForm.reason
            });

            setShowAdjustModal(false);
            setAdjustForm({ amount: '', type: 'add', reason: '' });
            await loadData();
        } catch (err: any) {
            console.error('Failed to adjust credits:', err);
            alert(`調整 Credits 失敗：${err.message}`);
        }
    };

    const filteredUsers = (displayUsers || []).filter(user =>
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalCredits = (displayUsers || []).reduce((sum, user) => sum + (user.total_credits || 0), 0);

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
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Credits Management</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                    Monitor and manually adjust user credit balances
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    title="Total Credits"
                    value={totalCredits.toLocaleString()}
                    subtext="System Wide"
                    icon={Wallet}
                    color="purple"
                    delay={0.1}
                />

                <StatsCard
                    title="Active Credit Users"
                    value={displayUsers.length.toString()}
                    subtext="Users with balance"
                    icon={TrendingUp}
                    color="green"
                    delay={0.2}
                />

                <StatsCard
                    title="Recent Adjustments"
                    value={displayTransactions.filter(t => t.admin_id).length.toString()}
                    subtext="Admin actions"
                    icon={RefreshCw}
                    color="blue"
                    delay={0.3}
                />
            </div>

            {/* Search */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users by email or name..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 font-medium outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        User Credits ({filteredUsers.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Subscription</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Purchased</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user, index) => (
                                    <motion.tr
                                        key={user.user_id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-blue-50/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="font-semibold bg-blue-50 text-blue-700 border-blue-100">
                                                {user.plan}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-gray-900 text-lg">
                                                {(user.total_credits || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm text-blue-600 font-bold">
                                                {(user.subscription_credits || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm text-green-600 font-bold">
                                                {(user.purchased_credits || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                colorScheme="blue"
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
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
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
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                                        tx.type === 'add' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                    )}>
                                        {tx.type === 'add' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{tx.reason}</div>
                                        <div className="text-xs text-gray-500 font-medium">
                                            {new Date(tx.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "font-black text-lg",
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
                                        Current balance: <span className="font-bold">{(selectedUser.total_credits || 0).toLocaleString()}</span> credits
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
                                colorScheme="blue"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAdjustCredits}
                                disabled={!adjustForm.amount || !adjustForm.reason}
                                colorScheme="blue"
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

const StatsCard = ({ title, value, subtext, icon: Icon, color, delay }: any) => {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-green-50 text-green-600 border-green-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
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
