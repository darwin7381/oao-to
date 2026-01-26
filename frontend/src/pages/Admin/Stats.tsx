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
import { cn } from '../../lib/utils';
import { adminApi, type AdminStats } from '../../lib/adminApi';

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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats().catch((error) => {
            console.error('[Stats] Unhandled error:', error);
        });
    }, [token]);

    const fetchStats = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getStats();
            // Note: API returns basic stats, may need to enhance
            setStats(data as any);
        } catch (err: any) {
            console.error('Failed to load stats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                <div className="text-red-500 text-xl mb-4">載入失敗</div>
                <div className="text-gray-600 mb-4">{error}</div>
                <button 
                    onClick={() => fetchStats()} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    重試
                </button>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-gray-500">無數據</div>
            </div>
        );
    }

    const displayStats = stats;

    const StatsCard = ({ title, value, subtext, icon: Icon, colorClass, delay }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <div className="glass-card hover-bounce p-6 rounded-3xl relative overflow-hidden group">
                <div className={cn("absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 transition-transform group-hover:scale-110", colorClass)} />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", colorClass)}>
                            <Icon className="w-6 h-6" />
                        </div>
                        {subtext && (
                            <div className={cn("px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-xs font-bold shadow-sm border border-white/50 text-gray-600")}>
                                {subtext}
                            </div>
                        )}
                    </div>
                    <div className="text-3xl font-black text-gray-800 tracking-tight mb-1">
                        {value}
                    </div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">{title}</div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">System Overview</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                    Real-time performance metrics and platform statistics
                </p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Users"
                    value={displayStats.users.total.toLocaleString()}
                    subtext={`+${displayStats.users.new_today} today`}
                    icon={Users}
                    colorClass="bg-blue-500"
                    delay={0.1}
                />
                <StatsCard
                    title="Total Links"
                    value={displayStats.links.total.toLocaleString()}
                    subtext={`+${displayStats.links.created_today} today`}
                    icon={LinkIcon}
                    colorClass="bg-indigo-500"
                    delay={0.2}
                />
                <StatsCard
                    title="Revenue"
                    value={`$${displayStats.revenue.this_month.toLocaleString()}`}
                    subtext="This Month"
                    icon={DollarSign}
                    colorClass="bg-green-500"
                    delay={0.3}
                />
                <StatsCard
                    title="API Health"
                    value={`${displayStats.api.avg_response_time}ms`}
                    subtext="Avg Latency"
                    icon={Zap}
                    colorClass="bg-orange-500"
                    delay={0.4}
                />
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Growth */}
                <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            User Growth Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-center justify-between p-5 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100/50 hover:shadow-md transition-shadow">
                            <div>
                                <div className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">New This Week</div>
                                <div className="text-3xl font-black text-gray-800">
                                    +{displayStats.users.new_this_week}
                                </div>
                            </div>
                            <div className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full text-sm">
                                +{((displayStats.users.new_this_week / displayStats.users.total) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-5 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100/50 hover:shadow-md transition-shadow">
                            <div>
                                <div className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Active Users</div>
                                <div className="text-3xl font-black text-gray-800">
                                    {displayStats.users.active.toLocaleString()}
                                </div>
                            </div>
                            <div className="text-blue-600 font-bold bg-blue-100 px-3 py-1 rounded-full text-sm">
                                {((displayStats.users.active / displayStats.users.total) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Credits Overview */}
                <Card className="border-0 shadow-xl shadow-purple-100/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white/50 border-b border-purple-50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                                <Activity className="w-5 h-5" />
                            </div>
                            Credits Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-gray-500 uppercase tracking-wide">Usage Rate</span>
                                <span className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                                    {((displayStats.credits.total_used / displayStats.credits.total_issued) * 100).toFixed(1)}%
                                </span>
                            </div>

                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full relative"
                                    style={{ width: `${(displayStats.credits.total_used / displayStats.credits.total_issued) * 100}%` }}
                                >
                                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">Issued</div>
                                    <div className="font-black text-gray-800 truncate" title={displayStats.credits.total_issued.toLocaleString()}>
                                        {(displayStats.credits.total_issued / 1000).toFixed(0)}k
                                    </div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-xl text-center border border-purple-100">
                                    <div className="text-xs text-purple-400 font-bold uppercase mb-1">Used</div>
                                    <div className="font-black text-purple-700 truncate" title={displayStats.credits.total_used.toLocaleString()}>
                                        {(displayStats.credits.total_used / 1000).toFixed(0)}k
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl text-center border border-green-100">
                                    <div className="text-xs text-green-400 font-bold uppercase mb-1">Left</div>
                                    <div className="font-black text-green-700 truncate" title={displayStats.credits.total_remaining.toLocaleString()}>
                                        {(displayStats.credits.total_remaining / 1000).toFixed(0)}k
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
