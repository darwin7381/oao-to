import { Link } from 'react-router-dom';
import UserMenu from '../UserMenu';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';

export default function Header() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // When sentinel allows header to be "unstuck" (visible) -> scrolled is false
                // When sentinel is NOT intersecting (scrolled past) -> scrolled is true
                setScrolled(!entry.isIntersecting);
            },
            { threshold: 0, rootMargin: "-20px 0px 0px 0px" } // Trigger when scrolled 20px
        );

        const sentinel = document.getElementById('scroll-sentinel');
        if (sentinel) observer.observe(sentinel);

        return () => observer.disconnect();
    }, []);

    return (
        <>
            {/* Scroll Sentinel */}
            <div id="scroll-sentinel" className="absolute top-0 left-0 w-full h-[1px] pointer-events-none opacity-0" />

            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    "transition-[padding,background-color]",
                    scrolled ? "py-2" : "py-4"
                )}
            >
                <div
                    className={cn(
                        "max-w-6xl mx-auto px-6 rounded-full duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        "transition-[background-color,box-shadow,margin,border-color]",
                        scrolled ? "bg-white/80 backdrop-blur-md shadow-lg shadow-orange-500/5 w-[calc(100%-2rem)] border border-white/50" : "bg-transparent border-transparent w-full"
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
        </>
    );
}
