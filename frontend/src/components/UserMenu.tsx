import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';
import Avatar from './Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, LogOut, Users, BarChart3, ChevronDown, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

export default function UserMenu() {
  const { user, loading, login, logout } = useAuth();
  const { isAdmin } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse border border-gray-200"></div>
    );
  }

  if (!user) {
    return (
      <Button onClick={login} variant="default" size="sm" className="rounded-full px-6">
        Login
      </Button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-all duration-200",
          isOpen ? "bg-gray-50 border-gray-300 ring-2 ring-blue-500/10" : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <Avatar
          src={user.avatar}
          alt={user.name}
          size="sm"
          className="border border-gray-200 w-8 h-8"
        />
        <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
          {user.name}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-3xl p-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50 border border-white/60 shadow-xl shadow-gray-200/20"
          >
            <div className="p-4 border-b border-gray-100/50 mb-2">
              <button className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/60 shadow-sm hover:shadow-md hover:bg-white/90 transition-all duration-300 group outline-none focus:ring-2 focus:ring-orange-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center border border-white">
                  <Avatar src={user.avatar} alt={user.name} className="w-full h-full" />
                </div>
                <div className="flex flex-col items-start px-1">
                  <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{user.name}</span>
                  <span className="text-xs text-gray-500 truncate">{user.email}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition-colors" />
              </button>
            </div>

            <div className="space-y-0.5">
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              {/* Admin Links */}
              {isAdmin && (
                <>
                  <div className="my-1 px-3 py-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admin</p>
                  </div>
                  <Link
                    to="/admin/users"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>User Management</span>
                  </Link>
                  <Link
                    to="/admin/stats"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>System Stats</span>
                  </Link>
                </>
              )}
            </div>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
