import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { motion } from 'framer-motion';
import {
    Users,
    Link as LinkIcon,
    TrendingUp,
    Activity,
    DollarSign,
    Zap,
    Globe,
    BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SystemStats {
    users: {
        total: number;
        active: number;
        new_today: number;
        new_this_week: number;
    };
    links: {
        total: number;
        created_today: number;
        created_this_week: number;
        total_clicks: number;
    };
    revenue: {
        total: number;
        this_month: number;
        this_week: number;
    };
    credits: {
        total_issued: number;
        total_used: number;
        total_remaining: number;
    };
    api: {
        total_requests: number;
        requests_today: number;
        avg_response_time: number;
    };
}

export default function AdminStats() {
    const { token } = useAuth();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);

    const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${apiUrl}/admin/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setStats(data.data);
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [apiUrl, token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Mock data if API not ready
    const mockStats: SystemStats = {
        users: {
            total: 1247,
            active: 892,
            new_today: 23,
            new_this_week: 156
        },
        links: {
            total: 45678,
            created_today: 234,
            created_this_week: 1567,
            total_clicks: 892341
        },
        revenue: {
            total: 45230,
            this_month: 12450,
            this_week: 3210
        },
        credits: {
            total_issued: 1000000,
            total_used: 456789,
            total_remaining: 543211
        },
        api: {
            total_requests: 2345678,
            requests_today: 12345,
            avg_response_time: 45
        }
    };

    const displayStats = stats || mockStats;

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-3">System Statistics</h1>
                <p className="text-lg text-gray-600 font-medium">
                    Real-time overview of platform performance and usage metrics
                </p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Users Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <Users className="w-8 h-8 opacity-80" />
                                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                                    +{displayStats.users.new_today} today
                                </div>
                            </div>
                            <div className="text-4xl font-black mb-1">
                                {displayStats.users.total.toLocaleString()}
                            </div>
                            <div className="text-sm opacity-90 font-medium">Total Users</div>
                            <div className="text-xs opacity-75 mt-2">
                                {displayStats.users.active.toLocaleString()} active
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Links Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <LinkIcon className="w-8 h-8 opacity-80" />
                                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                                    +{displayStats.links.created_today} today
                                </div>
                            </div>
                            <div className="text-4xl font-black mb-1">
                                {displayStats.links.total.toLocaleString()}
                            </div>
                            <div className="text-sm opacity-90 font-medium">Total Links</div>
                            <div className="text-xs opacity-75 mt-2">
                                {displayStats.links.total_clicks.toLocaleString()} total clicks
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Revenue Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <DollarSign className="w-8 h-8 opacity-80" />
                                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                                    This Month
                                </div>
                            </div>
                            <div className="text-4xl font-black mb-1">
                                ${displayStats.revenue.this_month.toLocaleString()}
                            </div>
                            <div className="text-sm opacity-90 font-medium">Revenue</div>
                            <div className="text-xs opacity-75 mt-2">
                                ${displayStats.revenue.total.toLocaleString()} total
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* API Usage Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <Zap className="w-8 h-8 opacity-80" />
                                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                                    {displayStats.api.avg_response_time}ms
                                </div>
                            </div>
                            <div className="text-4xl font-black mb-1">
                                {(displayStats.api.requests_today / 1000).toFixed(1)}K
                            </div>
                            <div className="text-sm opacity-90 font-medium">API Requests Today</div>
                            <div className="text-xs opacity-75 mt-2">
                                {(displayStats.api.total_requests / 1000000).toFixed(2)}M total
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            User Growth
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">This Week</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    +{displayStats.users.new_this_week}
                                </div>
                            </div>
                            <div className="text-green-600 font-semibold">
                                +{((displayStats.users.new_this_week / displayStats.users.total) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Active Users</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {displayStats.users.active.toLocaleString()}
                                </div>
                            </div>
                            <div className="text-blue-600 font-semibold">
                                {((displayStats.users.active / displayStats.users.total) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Credits Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-500" />
                            Credits Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Issued</span>
                                <span className="font-bold text-gray-900">
                                    {displayStats.credits.total_issued.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Used</span>
                                <span className="font-bold text-orange-600">
                                    {displayStats.credits.total_used.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Remaining</span>
                                <span className="font-bold text-green-600">
                                    {displayStats.credits.total_remaining.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-4">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                                    style={{ width: `${(displayStats.credits.total_used / displayStats.credits.total_issued) * 100}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                                {((displayStats.credits.total_used / displayStats.credits.total_issued) * 100).toFixed(1)}% utilized
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* System Health */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-500" />
                        System Health
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <div>
                                    <div className="text-sm text-gray-600">API Status</div>
                                    <div className="font-bold text-green-600">Operational</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-blue-500" />
                                <div>
                                    <div className="text-sm text-gray-600">Avg Response</div>
                                    <div className="font-bold text-blue-600">
                                        {displayStats.api.avg_response_time}ms
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <div className="flex items-center gap-3">
                                <Activity className="w-5 h-5 text-purple-500" />
                                <div>
                                    <div className="text-sm text-gray-600">Uptime</div>
                                    <div className="font-bold text-purple-600">99.9%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
