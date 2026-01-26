import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Users,
    Link as LinkIcon,
    MousePointerClick,
    DollarSign,
    Calendar,
    Award,
    Globe
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import { adminApi, type AnalyticsData } from '../../lib/adminApi';

export default function AdminAnalytics() {
    const { token } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => {
        loadAnalytics().catch((error) => {
            console.error('[Analytics] Unhandled error:', error);
        });
    }, [timeRange, token]);

    const loadAnalytics = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.getAnalytics(timeRange);
            setAnalytics(response.data);
        } catch (err: any) {
            console.error('Failed to load analytics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-red-500 text-xl font-bold mb-4">⚠️ 載入分析數據失敗</div>
                <div className="text-gray-600 mb-4 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
                <button 
                    onClick={() => loadAnalytics()} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                    重試
                </button>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-gray-500">無分析數據</div>
            </div>
        );
    }

    const displayAnalytics = analytics;

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Analytics Dashboard</h1>
                    <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                    <p className="text-lg text-gray-500 font-medium">
                        Deep insights into platform growth, user behavior, and revenue trends
                    </p>
                </div>
                <div className="flex gap-2">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                'px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                                timeRange === range
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            )}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Growth Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            User Growth
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={displayAnalytics.userGrowth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '12px',
                                            padding: '12px'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="users"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Growth */}
                <Card className="border-0 shadow-xl shadow-green-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-green-50 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            Revenue Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={displayAnalytics.revenueGrowth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '12px',
                                            padding: '12px'
                                        }}
                                    />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Users */}
                <Card className="border-0 shadow-xl shadow-purple-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-purple-50 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            Top Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            {displayAnalytics.topUsers.map((user, index) => (
                                <div
                                    key={user.email}
                                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition-all border border-gray-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-white",
                                            index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-500" :
                                            index === 1 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
                                            index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500" :
                                            "bg-gradient-to-br from-blue-400 to-blue-500"
                                        )}>
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">{user.email}</div>
                                            <div className="text-xs text-gray-500 font-semibold">
                                                {user.links || 0} links · {(user.clicks || 0).toLocaleString()} clicks
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Links */}
                <Card className="border-0 shadow-xl shadow-orange-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-orange-50 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                            Top Performing Links
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            {displayAnalytics.topLinks.map((link, index) => (
                                <div
                                    key={link.slug}
                                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition-all border border-gray-100"
                                >
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-white flex-shrink-0",
                                            index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-500" :
                                            index === 1 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
                                            index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500" :
                                            "bg-gradient-to-br from-orange-400 to-orange-500"
                                        )}>
                                            #{index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-mono font-bold text-blue-600 truncate">
                                                oao.to/{link.slug}
                                            </div>
                                            <div className="text-xs text-gray-500 font-semibold">
                                                {(link.clicks || 0).toLocaleString()} clicks
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Geographic Distribution & Plan Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Countries */}
                <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-500" />
                            Top Countries
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={displayAnalytics.clicksByCountry} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis
                                        dataKey="country"
                                        type="category"
                                        width={120}
                                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <Tooltip />
                                    <Bar dataKey="clicks" radius={[0, 8, 8, 0]}>
                                        {displayAnalytics.clicksByCountry.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Plan Distribution */}
                <Card className="border-0 shadow-xl shadow-purple-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-purple-50 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            Plan Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={displayAnalytics.planDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.plan} (${entry.count})`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {displayAnalytics.planDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
