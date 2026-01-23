import { Link } from 'react-router-dom';
import UserMenu from '../UserMenu';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';

export default function Header() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
                scrolled ? "py-2" : "py-4"
            )}
        >
            <div
                className={cn(
                    "max-w-6xl mx-auto px-6 rounded-full transition-all duration-300 ease-out",
                    scrolled 
                        ? "bg-white/80 backdrop-blur-md shadow-lg shadow-orange-500/5 w-[calc(100%-2rem)] border border-white/50" 
                        : "bg-transparent border-transparent w-full"
                )}
            >
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white shadow-lg shadow-orange-200/50 group-hover:scale-110 transition-transform duration-300 rotate-3 group-hover:rotate-6">
                            <span className="text-xl font-bold">O</span>
                        </div>
                        <span className="text-2xl font-black text-gray-800 tracking-tight">
                            OAO<span className="text-orange-400">.TO</span>
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/#features" className="text-gray-600 font-bold hover:text-orange-500 transition-colors">Features</Link>
                        <Link to="/#pricing" className="text-gray-600 font-bold hover:text-orange-500 transition-colors">Pricing</Link>
                        <Link to="/#resources" className="text-gray-600 font-bold hover:text-orange-500 transition-colors">Resources</Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        <UserMenu />
                    </div>
                </div>
            </div>
        </header>
    );
}
