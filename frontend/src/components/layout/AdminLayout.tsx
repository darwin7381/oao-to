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
    Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import UserMenu from '../UserMenu';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/stats', label: 'System Statistics', icon: BarChart3 },
    { path: '/admin/payments', label: 'Payment Management', icon: DollarSign },
    { path: '/admin/credits', label: 'Credits Management', icon: CreditCard },
    { path: '/admin/settings', label: 'System Settings', icon: SettingsIcon },
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
            {/* Background Pattern - Admin Style */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '3s' }} />
            </div>

            {/* Sidebar (Desktop) */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col h-screen fixed left-0 top-0 border-r border-blue-200/50 bg-white/60 backdrop-blur-xl z-40 transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-20" : "w-72"
                )}
            >
                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-24 w-6 h-6 bg-white border border-blue-200 rounded-full flex items-center justify-center text-blue-500 hover:text-blue-700 hover:scale-110 transition-all shadow-sm z-50"
                >
                    <ChevronRight className={cn("w-3 h-3 transition-transform duration-300", !isCollapsed && "rotate-180")} />
                </button>

                {/* Admin Brand */}
                <div className={cn("p-6 flex items-center border-b border-blue-100/50", isCollapsed ? "justify-center" : "justify-start")}>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-300 group-hover:scale-105 transition-transform flex-shrink-0">
                            <Shield className="w-5 h-5" />
                        </div>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="whitespace-nowrap"
                            >
                                <div className="text-xl font-black text-gray-800 tracking-tight">
                                    Admin Panel
                                </div>
                                <div className="text-xs text-blue-600 font-semibold">
                                    System Management
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Back to Dashboard Link */}
                <div className="px-3 py-4 border-b border-blue-100/50">
                    <Link
                        to="/dashboard"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-gray-600 hover:text-blue-600 hover:bg-blue-50",
                            isCollapsed && "justify-center px-0"
                        )}
                        title={isCollapsed ? "Back to Dashboard" : undefined}
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {!isCollapsed && <span className="text-sm font-semibold">Back to Dashboard</span>}
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
                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "text-blue-900 font-bold shadow-sm bg-blue-100/60 border border-blue-200/50"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-white/80",
                                    isCollapsed && "justify-center px-0"
                                )}
                            >
                                {isActive && !isCollapsed && (
                                    <motion.div
                                        layoutId="activeAdminNav"
                                        className="absolute inset-0 bg-blue-50 rounded-xl border border-blue-200/50"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon className={cn("w-5 h-5 relative z-10 flex-shrink-0", isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700")} />
                                {!isCollapsed && (
                                    <span className="relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                                )}
                                {isActive && !isCollapsed && <ChevronRight className="w-4 h-4 ml-auto text-blue-500 relative z-10" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin Badge */}
                <div className="p-4 border-t border-blue-100/50">
                    {!isCollapsed ? (
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl text-white text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                            <Shield className="w-8 h-8 mx-auto mb-2 relative z-10" />
                            <div className="text-xs font-bold uppercase tracking-wider mb-1 relative z-10">Administrator</div>
                            <div className="text-xs opacity-90 relative z-10">Full System Access</div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
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
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <span className="font-black text-lg text-gray-900">Admin</span>
                    </div>
                    <UserMenu />
                </header>

                {/* Desktop Header */}
                <header className="hidden lg:flex h-20 items-center justify-between px-8 sticky top-0 z-30 bg-white/40 backdrop-blur-md border-b border-blue-100/50">
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-blue-100/60 border border-blue-200/50 rounded-full">
                            <span className="text-sm font-bold text-blue-700">🛡️ Administrator Mode</span>
                        </div>
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
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-gray-800">Admin Panel</div>
                                        <div className="text-xs text-blue-600">System Management</div>
                                    </div>
                                </div>
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
