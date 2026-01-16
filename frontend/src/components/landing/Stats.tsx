export default function Stats() {
    return (
        <section className="py-20 bg-white/40 backdrop-blur-sm border-y border-white/50">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div className="text-4xl md:text-5xl font-black text-orange-400 mb-2">10M+</div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-sm">Links Created</div>
                    </div>
                    <div>
                        <div className="text-4xl md:text-5xl font-black text-pink-400 mb-2">500M+</div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-sm">Clicks Tracked</div>
                    </div>
                    <div>
                        <div className="text-4xl md:text-5xl font-black text-blue-400 mb-2">99.9%</div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-sm">Uptime</div>
                    </div>
                    <div>
                        <div className="text-4xl md:text-5xl font-black text-purple-400 mb-2">4.9/5</div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-sm">User Rating</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
