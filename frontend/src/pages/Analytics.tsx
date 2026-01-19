import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type Analytics as AnalyticsType } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MousePointerClick, Globe, Smartphone, Calendar, BarChart3, Loader2, Copy, Check, ExternalLink, Link2, QrCode, CornerDownRight, Image as ImageIcon, PenLine } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { cn } from '../lib/utils';
import { QRCodeGenerator } from '../components/QRCodeGenerator';

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-orange-100 ring-1 ring-orange-50">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        <p className="text-orange-500 font-bold text-lg">
          {payload[0].value} <span className="text-xs text-gray-400 font-normal">clicks</span>
        </p>
      </div>
    );
  }
  return null;
};

// Empty State Component
const EmptyChartState = ({ message }: { message: string }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm z-10 rounded-2xl border border-dashed border-gray-300">
    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
      <BarChart3 className="w-6 h-6 text-gray-300" />
    </div>
    <p className="text-gray-500 font-medium text-sm">{message}</p>
  </div>
);

export default function Analytics() {
  const { slug } = useParams<{ slug: string }>();
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    api.getAnalytics(slug)
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://oao.to/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 120, damping: 20 }
    }
  };

  // Helper to ensure at least some empty bars are shown if no data
  const getChartData = (data: any[], count: number, key: string) => {
    if (data && data.length > 0) return data;
    // Return dummy empty data to maintain grid structure
    return Array(count).fill(0).map((_) => ({
      [key]: '—',
      clicks: 0
    }));
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito flex flex-col">
      {/* 🔮 RESTORED: Animated Background Blobs from Home */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-orange-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '4s' }} />
      </div>

      <Header />

      <main className="flex-grow pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">

          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link to="/dashboard">
              <Button variant="ghost" className="pl-0 hover:bg-white/50 hover:text-orange-500 transition-all group text-gray-500 font-bold">
                <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center mr-2 group-hover:scale-110 transition-transform shadow-sm">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Back to Dashboard
              </Button>
            </Link>
          </motion.div>

          {loading ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-orange-400 animate-spin mb-4" />
              <p className="text-gray-400 font-bold animate-pulse">Crunching numbers...</p>
            </div>
          ) : !analytics ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-white/50 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-orange-500/10">
                <BarChart3 className="w-10 h-10 text-orange-300" />
              </div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">No stats found</h2>
              <p className="text-gray-500 font-medium mb-8">We couldn't find any data for this link.</p>
              <Link to="/dashboard">
                <Button size="lg" className="rounded-xl font-bold shadow-lg shadow-orange-500/20">Go Back Home</Button>
              </Link>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-12"
            >
              {/* 🚀 ITERATION 9: THE STANDARD (Bitly/Dub Clone) */}
              <motion.div variants={itemVariants}>
                <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-2xl">
                  <div className="flex flex-col lg:flex-row p-8 lg:p-10 gap-10">

                    {/* LEFT COLUMN: Metadata & Actions (The Workhorse) */}
                    <div className="flex-1 space-y-8">

                      {/* 1. Header: Favicon + Clean Title */}
                      <div className="flex items-start gap-5">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex-shrink-0">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(analytics.url).hostname}&sz=64`}
                            alt="favicon"
                            className="w-8 h-8 object-contain"
                            onError={(e) => { e.currentTarget.src = "https://www.google.com/s2/favicons?domain=google.com"; }}
                          />
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {/* STRICT TITLE SANITIZATION */}
                          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                            {(!analytics.title || analytics.title.includes('http') || analytics.title.includes('www.') || analytics.title.length > 100)
                              ? new URL(analytics.url).hostname.toUpperCase()
                              : analytics.title}
                          </h1>

                          <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span>{analytics.createdAt ? new Date(analytics.createdAt).toLocaleDateString() : 'Just now'}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-4 h-4" />
                              <span>{new URL(analytics.url).hostname}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. The Link Box (Dub/Bitly Style) */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Short Link</label>
                        <div className="flex items-center bg-gray-50 border border-gray-200 p-1.5 rounded-xl gap-2">

                          <div className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center shadow-sm">
                            <span className="text-gray-400 font-medium select-none">oao.to/</span>
                            <span className="text-gray-900 font-bold text-lg">{slug}</span>
                          </div>

                          <div className="flex items-center gap-1 pr-1">
                            <Button
                              variant="ghost"
                              onClick={handleCopy}
                              className={cn(
                                "h-11 px-4 font-bold text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all rounded-lg border border-transparent hover:border-gray-200",
                                copied && "text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700"
                              )}
                            >
                              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                              {copied ? "Copied" : "Copy"}
                            </Button>

                            <div className="relative group/qr">
                              <Button variant="ghost" className="h-11 w-11 p-0 text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all rounded-lg border border-transparent hover:border-gray-200">
                                <QrCode className="w-5 h-5" />
                              </Button>
                              {/* QR Popover */}
                              <div className="absolute top-full right-0 mt-2 hidden group-hover/qr:block p-4 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <QRCodeGenerator url={`https://oao.to/${slug}`} size={120} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Destination Row */}
                      <div className="flex items-start gap-3 pl-2 group/dest">
                        <CornerDownRight className="w-5 h-5 text-gray-300 mt-0.5 group-hover/dest:text-gray-500 transition-colors" />
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Destination URL</span>
                          <a
                            href={analytics.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-500 hover:text-blue-600 hover:underline truncate break-all transition-colors leading-snug font-mono text-sm"
                          >
                            {analytics.url}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Link Preview (The "Social Card") */}
                    <div className="hidden lg:block w-[380px] flex-shrink-0">
                      <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm h-full flex flex-col">
                        {/* Mock Image Area */}
                        <div className="h-44 bg-gray-100 w-full flex items-center justify-center border-b border-gray-200/60 relative group cursor-pointer" onClick={() => window.open(analytics.url, '_blank')}>
                          <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-8 h-8 text-gray-500" />
                          </div>
                          <ImageIcon className="w-12 h-12 text-gray-300" />
                        </div>

                        {/* Content Area */}
                        <div className="p-6 flex flex-col gap-3 flex-1 bg-white">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{new URL(analytics.url).hostname.replace('www.', '')}</div>

                          <h3 className="font-bold text-gray-900 leading-snug line-clamp-2">
                            {(!analytics.title || analytics.title.includes('http') || analytics.title.includes('www.') || analytics.title.length > 100)
                              ? new URL(analytics.url).hostname.toUpperCase()
                              : analytics.title}
                          </h3>

                          <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                            {analytics.description || `This link redirects to ${new URL(analytics.url).hostname}. Analysis and tracking provided by OAO.TO.`}
                          </p>
                        </div>
                      </div>
                      <p className="text-center text-xs font-medium text-gray-400 mt-3 select-none">
                        Preview
                      </p>
                    </div>

                  </div>
                </Card>
              </motion.div>

              {/* Core Stats Grid - Glassmorphism */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Clicks */}
                <motion.div variants={itemVariants}>
                  <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group rounded-[2.5rem]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner">
                        <MousePointerClick className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 bg-white/50 text-orange-600 rounded-full border border-orange-100">All Time</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Total Clicks</h3>
                      <p className="text-5xl font-black text-gray-800">{analytics.totalClicks.toLocaleString()}</p>
                    </div>
                  </Card>
                </motion.div>

                {/* Countries */}
                <motion.div variants={itemVariants}>
                  <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group rounded-[2.5rem]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform shadow-inner">
                        <Globe className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 bg-white/50 text-blue-600 rounded-full border border-blue-100">Global</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Countries Reach</h3>
                      <p className="text-5xl font-black text-gray-800">{analytics.byCountry.length}</p>
                    </div>
                  </Card>
                </motion.div>

                {/* Devices */}
                <motion.div variants={itemVariants}>
                  <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group rounded-[2.5rem]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-500 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner">
                        <Smartphone className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 bg-white/50 text-pink-600 rounded-full border border-pink-100">Tech</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Device Types</h3>
                      <p className="text-5xl font-black text-gray-800">{analytics.byDevice.length}</p>
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Main Charts Section - Glassmorphism */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Traffic Trend - Wide */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  <Card className="p-8 h-full bg-white/60 backdrop-blur-xl border-white/60 shadow-xl rounded-[2.5rem] relative min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-black text-gray-800">Traffic Trend</h3>
                      <div className="flex gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-white/50">
                        <div className="w-3 h-3 rounded-full bg-green-400 mt-1" />
                        <span className="text-xs text-gray-500 font-bold">Daily Clicks</span>
                      </div>
                    </div>

                    <div className="flex-1 w-full relative">
                      {(!analytics.byDay || analytics.byDay.length === 0) && (
                        <EmptyChartState message="No traffic data yet. Share your link!" />
                      )}
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData(analytics.byDay, 7, 'date')} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 700 }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 700 }}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff50' }} />
                          <Bar dataKey="clicks" radius={[12, 12, 0, 0]} maxBarSize={60}>
                            {getChartData(analytics.byDay, 7, 'date').map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={analytics.byDay?.length ? "#10b981" : "#e5e7eb"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </motion.div>

                {/* Device Breakdown - Tall & Narrow */}
                <motion.div variants={itemVariants}>
                  <Card className="p-8 h-full bg-white/60 backdrop-blur-xl border-white/60 shadow-xl rounded-[2.5rem] relative min-h-[400px]">
                    <h3 className="text-2xl font-black text-gray-800 mb-8">Devices</h3>
                    {(!analytics.byDevice || analytics.byDevice.length === 0) ? (
                      <div className="h-full flex flex-col items-center justify-center text-center pb-12">
                        <div className="w-20 h-20 bg-gray-50/50 rounded-full flex items-center justify-center mb-6">
                          <Smartphone className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-bold">No device data yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {analytics.byDevice.map((item, index) => {
                          const total = analytics.byDevice.reduce((acc, curr) => acc + curr.clicks, 0);
                          const percentage = Math.round((item.clicks / total) * 100);

                          return (
                            <div key={item.device} className="group">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-gray-700 text-lg">{item.device}</span>
                                <span className="text-sm font-bold text-gray-400">{percentage}%</span>
                              </div>
                              <div className="h-4 w-full bg-white/50 rounded-full overflow-hidden p-0.5 box-content border border-white/30">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                                  className={cn(
                                    "h-full rounded-full shadow-sm",
                                    index === 0 ? "bg-gradient-to-r from-purple-400 to-indigo-400" :
                                      index === 1 ? "bg-gradient-to-r from-pink-400 to-rose-400" :
                                        "bg-gradient-to-r from-orange-400 to-amber-400"
                                  )}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-2 text-right font-medium">{item.clicks} clicks</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </motion.div>
              </div>

              {/* Country Breakdown - Full Width Glass */}
              <motion.div variants={itemVariants}>
                <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl rounded-[2.5rem] mb-8 relative min-h-[350px] flex flex-col">
                  <h3 className="text-2xl font-black text-gray-800 mb-8">Top Countries</h3>
                  <div className="flex-1 w-full relative">
                    {(!analytics.byCountry || analytics.byCountry.length === 0) && (
                      <EmptyChartState message="We haven't seen any countries yet. Go global!" />
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData(analytics.byCountry, 5, 'country')} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e5e5" />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="country"
                          type="category"
                          width={120}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 700 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff50' }} />
                        <Bar dataKey="clicks" barSize={24} radius={[0, 8, 8, 0]}>
                          {getChartData(analytics.byCountry, 5, 'country').map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={analytics.byCountry?.length ? "#3b82f6" : "#e5e7eb"} fillOpacity={0.9} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>

            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
