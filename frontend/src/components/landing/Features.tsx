import { Card } from '../ui/Card';
import { Zap, Shield, BarChart3, Globe, Smartphone, QrCode } from 'lucide-react';

export default function Features() {
    return (
        <section id="features" className="py-24 relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-6">
                        Short Links, <span className="text-orange-500">Super Powers</span>
                    </h2>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        Everything you need to manage your links, wrapped in a cute package.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Custom Aliases */}
                    <Card className="p-8 bg-white border-white/60 shadow-xl shadow-orange-500/5 hover:-translate-y-1 transition-transform duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 mb-6 rotate-3">
                            <Globe className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-800 mb-3">Custom Aliases</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">
                            Ditch the random characters. Create memorable links like <span className="text-orange-500 font-bold">oao.to/super-sale</span>.
                        </p>
                    </Card>

                    {/* Card 2: Link Management */}
                    <Card className="p-8 bg-white border-white/60 shadow-xl shadow-blue-500/5 hover:-translate-y-1 transition-transform duration-300 md:mt-8">
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 mb-6 -rotate-3">
                            <Shield className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-800 mb-3">Link Dashboard</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">
                            Manage all your links in one place. Edit destinations, view history, and organize with ease.
                        </p>
                    </Card>

                    {/* Card 3: Deep Insights (Renamed from Analytics to avoid total dup) */}
                    <Card className="p-8 bg-white border-white/60 shadow-xl shadow-pink-500/5 hover:-translate-y-1 transition-transform duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-500 mb-6 rotate-6">
                            <BarChart3 className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-800 mb-3">Deep Insights</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">
                            Go beyond simple click counts. Track referrers, locations, and device types in real-time.
                        </p>
                    </Card>

                    {/* Card 4: QR Codes */}
                    <Card className="p-8 bg-white border-white/60 shadow-xl shadow-purple-500/5 hover:-translate-y-1 transition-transform duration-300 md:col-span-2">
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="flex-1">
                                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500 mb-6 rotate-3">
                                    <QrCode className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-extrabold text-gray-800 mb-3">Custom QR Codes</h3>
                                <p className="text-gray-500 font-medium leading-relaxed mb-6">
                                    Generate beautiful, scannable QR codes for every link instantly. Perfect for print marketing and events.
                                </p>
                            </div>
                            <div className="flex-shrink-0 p-4 bg-white rounded-3xl border-2 border-purple-50 shadow-inner">
                                {/* Mock UI for QR preview */}
                                <div className="w-32 h-32 bg-purple-50 rounded-xl flex items-center justify-center">
                                    <QrCode className="w-16 h-16 text-purple-300" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Card 5: Mobile */}
                    <Card className="p-8 bg-white border-white/60 shadow-xl shadow-green-500/5 hover:-translate-y-1 transition-transform duration-300">
                        <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-500 mb-6 -rotate-3">
                            <Smartphone className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-800 mb-3">Mobile First</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">
                            Manage your links on the go with our fully responsive dashboard.
                        </p>
                    </Card>
                </div>
            </div>
        </section>
    );
}
