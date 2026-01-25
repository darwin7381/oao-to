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

interface AnalyticsData {
    userGrowth: Array<{ date: string; users: number; newUsers: number }>;
    linkGrowth: Array<{ date: string; links: number; newLinks: number }>;
    revenueGrowth: Array<{ date: string; revenue: number }>;
    topUsers: Array<{ email: string; links: number; clicks: number }>;
    topLinks: Array<{ slug: string; clicks: number; url: string }>;
    clicksByCountry: Array<{ country: string; clicks: number }>;
    planDistribution: Array<{ plan: string; count: number; value: number }>;
}

export default function AdminAnalytics() {
    const { token } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

    useEffect(() => {
        loadAnalytics();
    }, [timeRange, token, apiUrl]);

    const loadAnalytics = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/admin/analytics?range=${timeRange}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setAnalytics(data.data);
            } else {
                console.warn('API not ready, using mock data');
            }
        } catch (error) {
            console.warn('Failed to load analytics, using mock data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock data
    const mockAnalytics: AnalyticsData = {
        userGrowth: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            users: 1000 + i * 50 + Math.random() * 100,
            newUsers: 10 + Math.floor(Math.random() * 30)
        })),
        linkGrowth: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            links: 5000 + i * 200 + Math.random() * 500,
            newLinks: 50 + Math.floor(Math.random() * 150)
        })),
        revenueGrowth: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: 100 + i * 50 + Math.random() * 200
        })),
        topUsers: [
            { email: 'power-user@company.com', links: 456, clicks: 123456 },
            { email: 'marketing@startup.io', links: 234, clicks: 98765 },
            { email: 'social@brand.com', links: 189, clicks: 76543 },
            { email: 'blogger@medium.com', links: 145, clicks: 54321 },
            { email: 'developer@tech.co', links: 123, clicks: 43210 },
        ],
        topLinks: [
            { slug: 'viral-post', clicks: 45678, url: 'https://blog.example.com/viral' },
            { slug: 'product-launch', clicks: 34567, url: 'https://startup.io/launch' },
            { slug: 'tutorial', clicks: 23456, url: 'https://dev.to/guide' },
            { slug: 'promo-2026', clicks: 19876, url: 'https://shop.com/promo' },
            { slug: 'article', clicks: 15432, url: 'https://news.site/article' },
        ],
        clicksByCountry: [
            { country: 'United States', clicks: 234567 },
            { country: 'United Kingdom', clicks: 123456 },
            { country: 'Germany', clicks: 98765 },
            { country: 'Japan', clicks: 87654 },
            { country: 'Canada', clicks: 76543 },
        ],
        planDistribution: [
            { plan: 'Free', count: 800, value: 800 },
            { plan: 'Starter', count: 250, value: 250 },
            { plan: 'Pro', count: 150, value: 150 },
            { plan: 'Enterprise', count: 47, value: 47 },
        ]
    };

    const displayAnalytics = analytics || mockAnalytics;

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

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
                                                {user.links} links · {user.clicks.toLocaleString()} clicks
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
                                                {link.clicks.toLocaleString()} clicks
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
