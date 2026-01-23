import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Key,
    CreditCard,
    BookOpen,
    Settings,
    Menu,
    X,
    ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import UserMenu from '../UserMenu';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/api-keys', label: 'API Keys', icon: Key },
    { path: '/credits', label: 'Credits & Usage', icon: CreditCard },
    { path: '/api-docs', label: 'API Documentation', icon: BookOpen },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-[#FDFBF7] font-nunito flex">
            {/* Background Blobs (Fixed) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] bg-orange-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" style={{ animationDelay: '3s' }} />
            </div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-orange-100/50 bg-white/50 backdrop-blur-xl z-40">
                <div className="p-6">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform">
                            O
                        </div>
                        <span className="text-2xl font-black text-gray-800 tracking-tight">
                            OAO.TO
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "text-orange-900 font-bold shadow-sm"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-white/60"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-orange-100/50 rounded-2xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon className={cn("w-5 h-5 relative z-10", isActive ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600")} />
                                <span className="relative z-10">{item.label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-orange-400 relative z-10" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-orange-100/50">
                    <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-2xl border border-orange-100 text-center">
                        <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Current Plan</div>
                        <div className="font-bold text-gray-900 mb-2">Free Starter</div>
                        <Link to="/pricing" className="text-xs font-semibold text-orange-600 hover:underline">
                            Upgrade Plan
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 z-10">

                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-50 px-4 h-16 flex items-center justify-between">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                        <Menu className="w-6 h-6" />
                    </button>
                    <Link to="/" className="font-black text-xl text-gray-900">OAO.TO</Link>
                    <UserMenu />
                </header>

                {/* Desktop Header (Top Bar with UserMenu) */}
                <header className="hidden lg:flex h-20 items-center justify-end px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/50 shadow-sm">
                        <UserMenu />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Menu Backdrop */}
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
                                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-xl font-black">
                                        O
                                    </div>
                                    <span className="text-2xl font-black text-gray-800">OAO.TO</span>
                                </Link>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

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
                                                    ? "bg-orange-50 text-orange-900 font-bold"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5", isActive ? "text-orange-500" : "text-gray-400")} />
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
