import { Link } from 'react-router-dom';
import { Github, Twitter, Heart } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-white/50 backdrop-blur-sm border-t border-orange-100 pt-16 pb-8">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4 group">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white shadow-md rotate-3 group-hover:rotate-6 transition-transform">
                                <span className="font-bold text-sm">O</span>
                            </div>
                            <span className="text-xl font-black text-gray-800">
                                OAO<span className="text-orange-400">.TO</span>
                            </span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Making the web cuter, shorter, and more shareable. One link at a time. ✨
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">URL Shortener</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">QR Codes</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Link-in-Bio</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Analytics</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Blog</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Developers</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Support</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Status</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">About</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Careers</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Privacy</Link></li>
                            <li><Link to="#" className="hover:text-orange-500 transition-colors">Terms</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-orange-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-400 text-sm">
                        © 2026 OAO.TO Inc. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors"><Twitter className="w-5 h-5" /></a>
                        <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors"><Github className="w-5 h-5" /></a>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                            Made with <Heart className="w-4 h-4 text-red-400 fill-current" /> by Joey
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
