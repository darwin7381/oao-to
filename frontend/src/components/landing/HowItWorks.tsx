import { ArrowRight } from 'lucide-react';

export default function HowItWorks() {
    return (
        <section id="how" className="py-24">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-6">
                        Simple as <span className="text-pink-500">1, 2, 3</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-1 bg-gradient-to-r from-orange-200 via-pink-200 to-purple-200 -z-10 rounded-full" />

                    {/* Step 1 */}
                    <div className="text-center relative">
                        <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-xl shadow-orange-100 border-4 border-orange-50 flex items-center justify-center text-4xl font-black text-orange-400 mb-8 z-10">
                            1
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Paste Link</h3>
                        <p className="text-gray-500 leading-relaxed">
                            Copy your long, messy URL and paste it into the magic box above.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="text-center relative">
                        <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-xl shadow-pink-100 border-4 border-pink-50 flex items-center justify-center text-4xl font-black text-pink-400 mb-8 z-10">
                            2
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Click Shorten</h3>
                        <p className="text-gray-500 leading-relaxed">
                            Watch our engine compress your link instantly and generate a QR code.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="text-center relative">
                        <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-xl shadow-purple-100 border-4 border-purple-50 flex items-center justify-center text-4xl font-black text-purple-400 mb-8 z-10">
                            3
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Share & Track</h3>
                        <p className="text-gray-500 leading-relaxed">
                            Share your new cute link anywhere and track every click in real-time.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
