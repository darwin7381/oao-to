import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { Link as LinkIcon, Settings, AlertCircle, ArrowRight, Sparkles, Zap, Shield, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Features from '../components/landing/Features';
import Stats from '../components/landing/Stats';
import HowItWorks from '../components/landing/HowItWorks';

export default function NewHome() {
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'access_denied') {
      setAuthError('您拒絕了授權 😢');
    } else if (error === 'auth_failed') {
      setAuthError('登入出了點小差錯，請再試一次');
    }
  }, [searchParams]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const apiUrl = import.meta.env.PROD
      ? 'https://api.oao.to/shorten'
      : 'http://localhost:8788/shorten';

    const shortUrlBase = import.meta.env.PROD
      ? 'https://oao.to'
      : 'http://localhost:8787';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          customSlug: showCustom && customSlug ? customSlug : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Oops! 創建失敗了');
      }

      const data = await response.json();
      data.shortUrl = data.shortUrl.replace('http://localhost:55458', shortUrlBase);
      setResult(data);
      setUrl('');
      setCustomSlug('');
      setShowCustom(false);
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">

      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-orange-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <Header />

      <main>
        {/* HERO SECTION */}
        <section className="pt-40 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-8"
                >
                  <div className="mx-auto max-w-md flex items-center justify-center gap-3 p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-3xl shadow-lg shadow-red-100">
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-bold">{authError}</span>
                    <button onClick={() => setAuthError(null)} className="ml-2 hover:bg-red-100 p-2 rounded-full transition-colors">
                      ✕
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center mb-16 space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-100 text-orange-500 rounded-full text-sm font-bold shadow-sm mb-6 hover:scale-105 transition-transform cursor-default">
                  <Sparkles className="w-4 h-4 text-yellow-400 fill-current" />
                  Make Links Cute & Short
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-gray-800 mb-6 leading-tight">
                  Shorten URLs,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400">
                    Sparkle Your Brand
                  </span>
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
                  Transform long, messy links into clean, shareable shortcuts.
                  Now with <span className="text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg">QR Codes</span> and detailed analytics! ✨
                </p>
              </motion.div>

              {/* INPUT CARD */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-2xl mx-auto"
              >
                <Card className="glass-panel p-3">
                  <form onSubmit={handleShorten} className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300">
                        <LinkIcon className="w-6 h-6" />
                      </div>
                      <input
                        type="url"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste a long link here..."
                        className="w-full h-16 pl-14 pr-4 bg-orange-50/50 hover:bg-orange-50 border-2 border-transparent focus:border-orange-200 focus:bg-white rounded-2xl outline-none text-lg text-gray-700 placeholder:text-gray-400 py-4 transition-all"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="h-16 rounded-2xl px-8 text-lg hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
                    >
                      {loading ? 'Magic...' : 'Shorten!'}
                    </Button>
                  </form>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCustom(!showCustom)}
                      className={cn(
                        "text-sm font-bold flex items-center gap-2 transition-colors px-3 py-1 rounded-xl",
                        showCustom ? "bg-orange-100 text-orange-600" : "text-gray-400 hover:text-orange-400"
                      )}
                    >
                      <Settings className="w-4 h-4" />
                      {showCustom ? 'Custom Slug Active' : 'Customize?'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showCustom && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <div className="flex items-center gap-2 p-2 bg-orange-50/50 rounded-2xl border-2 border-orange-50">
                            <span className="pl-3 text-orange-400 font-bold">oao.to/</span>
                            <input
                              type="text"
                              value={customSlug}
                              onChange={(e) => setCustomSlug(e.target.value)}
                              placeholder="super-cute-name"
                              className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 placeholder:text-orange-200 font-bold"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>

                {/* RESULT CARD */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mt-8"
                    >
                      <Card className="glass-panel p-0 overflow-hidden relative border-white/60">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-pink-400" />
                        <div className="p-8 text-center md:text-left flex flex-col md:flex-row gap-8 items-center bg-white/60">
                          <div className="flex-shrink-0">
                            <QRCodeGenerator url={result.shortUrl} size={150} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-black text-gray-800 mb-2">Yaay! Ready nicely! 🎉</h3>
                            <p className="text-gray-500 mb-6 font-medium truncate">{result.url}</p>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-2xl border border-orange-100">
                                <a
                                  href={result.shortUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 text-xl font-black text-orange-500 hover:text-orange-600 px-4 truncate text-center md:text-left"
                                >
                                  {result.shortUrl}
                                </a>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  size="lg"
                                  onClick={() => copyToClipboard(result.shortUrl)}
                                  className={cn(
                                    "flex-1 rounded-xl font-bold h-12 text-base transition-all",
                                    copied ? "bg-green-400 hover:bg-green-500 shadow-green-200" : ""
                                  )}
                                >
                                  {copied ? 'Copied!' : 'Copy Link'}
                                </Button>
                                <a href={result.shortUrl} target="_blank" rel="noreferrer" className="flex-none">
                                  <Button variant="secondary" size="icon" className="h-12 w-12 rounded-xl">
                                    <ArrowRight className="w-5 h-5" />
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-orange-50/50 p-4 text-center border-t border-orange-100">
                          <button
                            onClick={() => setResult(null)}
                            className="text-sm font-bold text-orange-400 hover:text-orange-600 transition-colors"
                          >
                            Create another one ✨
                          </button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Playful Hero Cards - Core Values */}
              {/* Playful Hero Cards - Core Values */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.25,
                      delayChildren: 0.5
                    }
                  }
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left"
              >
                {/* Card 1: Super Fast - Tilted Right */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 50, rotate: -10, scale: 0.9 },
                    show: {
                      opacity: 1,
                      y: 0,
                      rotate: 0,
                      scale: 1,
                      transition: { type: "spring", stiffness: 80, damping: 20, mass: 1.2 }
                    }
                  }}
                >
                  <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-orange-100/50 rotate-3 hover:rotate-0 hover:scale-110 hover:border-orange-300 hover:shadow-2xl hover:shadow-orange-400/30 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default group h-full">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 shadow-sm group-hover:shadow-orange-200">
                      <Zap className="w-6 h-6 fill-current" />
                    </div>
                    <h3 className="text-lg font-extrabold text-gray-800 mb-2 group-hover:text-orange-500 transition-colors duration-300">Super Fast</h3>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">Redirects in blink of an eye (&lt;10ms) via Edge Network.</p>
                  </Card>
                </motion.div>

                {/* Card 2: Secure - Tilted Left */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 50, scale: 0.9 },
                    show: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { type: "spring", stiffness: 120, damping: 20, mass: 1 }
                    }
                  }}
                >
                  <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-blue-100/50 -rotate-2 hover:rotate-0 hover:scale-110 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-400/30 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default group h-full md:mt-8">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-300 shadow-sm group-hover:shadow-blue-200">
                      <Shield className="w-6 h-6 fill-current" />
                    </div>
                    <h3 className="text-lg font-extrabold text-gray-800 mb-2 group-hover:text-blue-500 transition-colors duration-300">Secure</h3>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">Enterprise-grade security standards to keep your data safe.</p>
                  </Card>
                </motion.div>

                {/* Card 3: Analytics - Tilted Right */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 50, rotate: 10, scale: 0.9 },
                    show: {
                      opacity: 1,
                      y: 0,
                      rotate: 0,
                      scale: 1,
                      transition: { type: "spring", stiffness: 120, damping: 20, mass: 1 }
                    }
                  }}
                >
                  <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-pink-100/50 rotate-3 hover:rotate-0 hover:scale-110 hover:border-pink-300 hover:shadow-2xl hover:shadow-pink-400/30 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default group h-full">
                    <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-500 mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 shadow-sm group-hover:shadow-pink-200">
                      <BarChart3 className="w-6 h-6 fill-current" />
                    </div>
                    <h3 className="text-lg font-extrabold text-gray-800 mb-2 group-hover:text-pink-500 transition-colors duration-300">Analytics</h3>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">Know your audience with cute but powerful charts.</p>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* REST OF LANDING PAGE */}
        <Stats />
        <Features />
        <HowItWorks />

        {/* CTA */}
        <section className="py-24 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <div className="p-12 rounded-[3rem] bg-gradient-to-br from-orange-400 to-pink-500 text-white relative overflow-hidden shadow-2xl border border-white/20">
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-black mb-6">Ready to start?</h2>
                <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto font-medium">Join 10+ million users calling OAO.TO home for their links.</p>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-16 px-10 rounded-full text-xl font-black bg-white text-orange-500 hover:bg-white/90 hover:scale-105 shadow-xl"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Get Started for Free
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
