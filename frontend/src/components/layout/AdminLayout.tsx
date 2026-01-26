import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
    Users,
    BarChart3,
    CreditCard,
    DollarSign,
    Settings as SettingsIcon,
    Menu,
    X,
    ChevronRight,
    ArrowLeft,
    Shield,
    Link as LinkIcon,
    Key,
    TrendingUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import UserMenu from '../UserMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, FileText } from 'lucide-react';

const NAV_ITEMS = [
    { path: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    { path: '/admin/links', label: 'Links', icon: LinkIcon },
    { path: '/admin/api-keys', label: 'API Keys', icon: Key },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/support', label: 'Support', icon: Headphones },
    { path: '/admin/payments', label: 'Payments', icon: DollarSign },
    { path: '/admin/credits', label: 'Credits', icon: CreditCard },
    { path: '/admin/plans', label: 'Plans', icon: FileText },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: BarChart3 },
    { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

export default function AdminLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-nunito flex">
            {/* Background Pattern - Admin Style (Blue) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" style={{ animationDelay: '3s' }} />
            </div>

            {/* Sidebar (Desktop) */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col h-screen fixed left-0 top-0 border-r border-blue-100/50 bg-white/50 backdrop-blur-xl z-40 transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-20" : "w-72"
                )}
            >
                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-24 w-6 h-6 bg-white border border-blue-100 rounded-full flex items-center justify-center text-blue-400 hover:text-blue-600 hover:scale-110 transition-all shadow-sm z-50"
                >
                    <ChevronRight className={cn("w-3 h-3 transition-transform duration-300", !isCollapsed && "rotate-180")} />
                </button>

                {/* Logo - OAO.TO */}
                <div className={cn("p-6 flex items-center border-b border-blue-100/50", isCollapsed ? "justify-center" : "justify-start")}>
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform flex-shrink-0">
                            O
                        </div>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="whitespace-nowrap"
                            >
                                <div className="text-xl font-black text-gray-800 tracking-tight">
                                    OAO.TO
                                </div>
                                <div className="text-xs text-orange-500 font-bold uppercase tracking-wider">
                                    Admin Portal
                                </div>
                            </motion.div>
                        )}
                    </Link>
                </div>

                {/* Back to Dashboard Link */}
                <div className="px-3 py-4 border-b border-blue-100/50">
                    <Link
                        to="/dashboard"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-gray-500 hover:text-blue-600 hover:bg-blue-50/50",
                            isCollapsed && "justify-center px-0"
                        )}
                        title={isCollapsed ? "Back to Dashboard" : undefined}
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {!isCollapsed && <span className="text-sm font-bold">Back to Dashboard</span>}
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "text-blue-900 font-bold shadow-sm bg-blue-50/50"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-white/60",
                                    isCollapsed && "justify-center px-0"
                                )}
                            >
                                {isActive && !isCollapsed && (
                                    <motion.div
                                        layoutId="activeAdminNav"
                                        className="absolute inset-0 bg-blue-100/50 rounded-2xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon className={cn("w-5 h-5 relative z-10 flex-shrink-0", isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-600")} />
                                {!isCollapsed && (
                                    <span className="relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                                )}
                                {isActive && !isCollapsed && <ChevronRight className="w-4 h-4 ml-auto text-blue-400 relative z-10" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin Badge */}
                <div className="p-4 border-t border-blue-100/50">
                    {!isCollapsed ? (
                        <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 text-center relative overflow-hidden group">
                            <Shield className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                                System Status
                            </div>
                            <div className="font-bold text-sm text-gray-900 flex items-center justify-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Operational
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center shadow-md" title="System Status: Operational">
                                <Shield className="w-5 h-5" />
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 z-10 transition-all duration-300 ease-in-out",
                isCollapsed ? "lg:ml-20" : "lg:ml-72"
            )}>

                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100 px-4 h-16 flex items-center justify-between">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                        <Menu className="w-6 h-6" />
                    </button>
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-black">
                            O
                        </div>
                        <span className="font-black text-lg text-gray-900">OAO.TO</span>
                    </Link>
                    <UserMenu />
                </header>

                {/* Desktop Header */}
                <header className="hidden lg:flex h-20 items-center justify-between px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        {/* Breadcrumbs or additional header content could go here */}
                    </div>
                    <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/50 shadow-sm">
                        <UserMenu />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-80 bg-white z-50 lg:hidden shadow-2xl p-6 flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <Link to="/" className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xl font-black">
                                        O
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-gray-800">OAO.TO</div>
                                        <div className="text-xs text-orange-500 font-bold uppercase">Admin Portal</div>
                                    </div>
                                </Link>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <Link
                                to="/dashboard"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 mb-4 border border-blue-100"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="font-semibold">Back to Dashboard</span>
                            </Link>

                            <nav className="flex-1 space-y-1">
                                {NAV_ITEMS.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                                isActive
                                                    ? "bg-blue-100 text-blue-900 font-bold border border-blue-200"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-500")} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
