import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type Analytics as AnalyticsType } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, MousePointerClick, Globe, Smartphone, Calendar, BarChart3, Loader2, Copy, Check, ExternalLink, Link2, QrCode, CornerDownRight, Image as ImageIcon, PenLine, X, ScanLine, Download, Edit2, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
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
  const [editingField, setEditingField] = useState<'title' | 'description' | 'image' | null>(null);
  const [editValues, setEditValues] = useState({
    title: '',
    description: '',
    image: '',
  });
  const [saving, setSaving] = useState(false);
  const [refetching, setRefetching] = useState(false);

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

  const handleDownloadQR = () => {
    const svg = document.querySelector('#qr-download-target svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      ctx?.drawImage(img, 0, 0, 1000, 1000);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `oao-${slug}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleStartEdit = (field: 'title' | 'description' | 'image') => {
    if (!analytics) return;
    
    setEditingField(field);
    setEditValues({
      title: analytics.title || '',
      description: analytics.description || '',
      image: analytics.image || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
  };

  const handleSaveEdit = async () => {
    if (!analytics || !slug || !editingField) return;
    
    setSaving(true);
    try {
      const result = await api.updateLink(slug, {
        title: editValues.title,
        description: editValues.description,
        image: editValues.image,
      });
      
      setAnalytics(prev => prev ? {
        ...prev,
        title: result.data.title,
        description: result.data.description,
        image: result.data.image,
      } : null);
      
      setEditingField(null);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('儲存失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  const handleRefetch = async () => {
    if (!analytics || !slug) return;
    
    setRefetching(true);
    try {
      const result = await api.refetchMetadata(slug);
      
      setAnalytics(prev => prev ? {
        ...prev,
        title: result.data.title,
        description: result.data.description,
        image: result.data.image,
      } : null);
      
      setEditValues({
        title: result.data.title || '',
        description: result.data.description || '',
        image: result.data.image || '',
      });
      
    } catch (error) {
      console.error('Failed to refetch:', error);
      alert('重新抓取失敗，請重試');
    } finally {
      setRefetching(false);
    }
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
      {/* 🔮 Background Blobs */}
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
              {/* 🚀 ITERATION 22 & 23: NUCLEAR REDESIGN (Strict & Clean) + UX Polish */}
              <motion.div variants={itemVariants}>
                <Card className="bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-orange-500/10 rounded-[2.5rem] relative group hover:shadow-orange-500/20 transition-all duration-500 z-10 w-full">

                  {/* Fresh Gradient Accent */}
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-orange-100/30 via-pink-100/20 to-transparent blur-3xl -mr-32 -mt-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-tr-[2.5rem]" />

                  <div className="flex flex-col lg:flex-row p-8 lg:p-12 gap-10 relative z-10">

                    {/* LEFT COLUMN: Metadata & Actions */}
                    <div className="flex-1 space-y-8 min-w-0">

                      {/* 1. Header: Favicon + Clean Title */}
                      <div className="flex items-start gap-5">
                        <div className="p-4 bg-white rounded-2xl border border-orange-100 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(analytics.url).hostname}&sz=64`}
                            alt="favicon"
                            className="w-10 h-10 object-contain"
                            onError={(e) => { e.currentTarget.src = "https://www.google.com/s2/favicons?domain=google.com"; }}
                          />
                        </div>
                        <div className="space-y-2 pt-1 min-w-0">
                          {/* 標題編輯 */}
                          <div className="flex items-center gap-3 group/title">
                            {editingField === 'title' ? (
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  value={editValues.title}
                                  onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                  className="text-2xl font-bold"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={saving}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <h1 className="text-3xl font-black text-gray-900 leading-tight tracking-tight truncate">
                                  {(analytics.title && !analytics.title.includes('http') && !analytics.title.includes('www.') && analytics.title.length <= 100)
                                    ? analytics.title
                                    : new URL(analytics.url).hostname.replace('www.', '').toUpperCase()}
                                </h1>
                                <button
                                  onClick={() => handleStartEdit('title')}
                                  className="flex-shrink-0 opacity-0 group-hover/title:opacity-100 transition-opacity p-2 hover:bg-orange-50 rounded-lg text-orange-600"
                                  title="編輯標題"
                                >
                                  <PenLine className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-orange-100">
                              <Calendar className="w-3.5 h-3.5 text-orange-400" />
                              <span className="text-xs font-bold text-gray-600">{analytics.createdAt ? new Date(analytics.createdAt).toLocaleDateString() : 'Just now'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-blue-100">
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-xs font-bold text-gray-600 truncate max-w-[200px]">{new URL(analytics.url).hostname}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Short Link Asset (STRICT LAYOUT + HOVER DELAY) */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Short Link Asset</label>

                        <div className="flex flex-col sm:flex-row gap-3 h-auto sm:h-[72px]">
                          {/* Input Capsule: Link + Copy (Full width minus 72px) */}
                          <div className="flex-1 bg-white border-2 border-orange-100 rounded-2xl flex items-center justify-between p-2 pl-6 shadow-sm hover:border-orange-300 transition-all duration-300 cursor-text group/input" onClick={handleCopy}>
                            <div className="flex items-baseline gap-0.5 min-w-0 overflow-hidden" >
                              <span className="text-orange-400 font-bold text-xl select-none flex-shrink-0">oao.to/</span>
                              <span className="text-gray-900 font-bold text-xl tracking-tight truncate group-hover/input:text-orange-600 transition-colors">{slug}</span>
                            </div>

                            <Button
                              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                              className={cn(
                                "h-full px-8 font-bold text-base rounded-xl transition-all ml-4 flex-shrink-0",
                                copied
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700"
                              )}
                            >
                              {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                              {copied ? "Copied" : "Copy"}
                            </Button>
                          </div>

                          {/* QR Trigger: Fixed 72px Square (Sibling) */}
                          <div className="w-[72px] h-[72px] bg-white border-2 border-orange-100 rounded-2xl flex items-center justify-center relative group/qr shadow-sm hover:border-orange-300 transition-all cursor-pointer flex-shrink-0 z-20">
                            {/* The Visible Thumbnail (Scaled Down) */}
                            <div className="p-3 w-full h-full flex items-center justify-center">
                              <QRCodeGenerator url={`https://oao.to/${slug}`} />
                            </div>

                            {/* The Popover (Floating Top-Right) */}
                            <div className="absolute bottom-full right-0 mb-3 z-50 pointer-events-none group-hover/qr:pointer-events-auto
                                       opacity-0 invisible translate-y-2 scale-95
                                       group-hover/qr:opacity-100 group-hover/qr:visible group-hover/qr:translate-y-0 group-hover/qr:scale-100
                                       transition-all duration-500 ease-out group-hover/qr:duration-200 delay-100 group-hover/qr:delay-0">

                              <div className="bg-white p-5 rounded-[2rem] shadow-2xl shadow-orange-900/10 border border-orange-100 w-56 flex flex-col items-center">
                                {/* Large QR */}
                                <div id="qr-download-target" className="bg-white p-2 rounded-xl mb-3 border border-orange-50 w-full flex items-center justify-center">
                                  <QRCodeGenerator url={`https://oao.to/${slug}`} />
                                </div>

                                {/* Action Button (INSIDE POPOVER) */}
                                <Button
                                  size="sm"
                                  onClick={handleDownloadQR}
                                  className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl h-9"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Save Image
                                </Button>
                              </div>

                              {/* Invisible Bridge to prevent mouse gap issues */}
                              <div className="absolute top-full left-0 w-full h-3 bg-transparent"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Destination Row */}
                      <div className="mt-6 p-4 rounded-xl bg-emerald-50/50 border-2 border-dashed border-emerald-200/60 flex items-start gap-4 group/dest hover:bg-emerald-50 transition-colors">
                        <div className="mt-0.5 p-1.5 bg-emerald-100 rounded-lg text-emerald-600 group-hover/dest:scale-110 transition-transform duration-300">
                          <CornerDownRight className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5 tracking-widest flex items-center gap-1">
                            Target Destination
                          </div>
                          <a
                            href={analytics.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-500 font-bold font-mono text-sm break-all hover:underline decoration-sky-300 underline-offset-4 leading-relaxed block group-hover/dest:text-sky-600 transition-colors"
                          >
                            {analytics.url}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Link Preview */}
                    <div className="hidden lg:block w-[380px] flex-shrink-0 perspective-1000">
                      {/* 重新抓取按鈕 */}
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRefetch}
                          disabled={refetching}
                          className="bg-white hover:bg-blue-50 border-blue-200 text-blue-600"
                        >
                          <RefreshCw className={`w-4 h-4 mr-1.5 ${refetching ? 'animate-spin' : ''}`} />
                          {refetching ? '抓取中...' : '重新抓取元數據'}
                        </Button>
                      </div>
                      
                      <div className="p-2 border-2 border-dashed border-gray-200 rounded-[2.2rem]">
                        <div className="bg-white rounded-[1.8rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden h-full flex flex-col transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-100 group/card cursor-pointer rotate-1 hover:rotate-0 transform origin-center" onClick={() => window.open(analytics.url, '_blank')}>

                          {/* Preview Image Area - 可編輯 */}
                          <div className="h-48 bg-gray-50 w-full flex items-center justify-center border-b border-gray-100 relative overflow-hidden group/image">
                            {analytics.image ? (
                              <>
                                <img 
                                  src={analytics.image} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                  }}
                                />
                                <div className="fallback-icon hidden absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                  <ImageIcon className="w-16 h-16 text-gray-300" />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 group-hover/card:scale-110 transition-transform duration-700" />
                                <ImageIcon className="w-16 h-16 text-gray-300 relative z-10 group-hover/card:text-orange-200 transition-colors duration-500" />
                              </>
                            )}
                            
                            {/* 編輯圖片按鈕 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit('image');
                              }}
                              className="absolute top-3 right-3 opacity-0 group-hover/image:opacity-100 transition-opacity p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white text-orange-600 z-20"
                              title="編輯預覽圖片"
                            >
                              <PenLine className="w-4 h-4" />
                            </button>
                            
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 bg-black/5 backdrop-blur-[2px] pointer-events-none">
                              <div className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg font-bold text-gray-800 text-sm flex items-center gap-2 transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                                <ExternalLink className="w-4 h-4" /> Visit Site
                              </div>
                            </div>
                          </div>

                          {/* Content Area */}
                          <div className="p-6 flex flex-col gap-3 flex-1 bg-white relative">
                            <div className="flex items-center gap-2">
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${new URL(analytics.url).hostname}&sz=32`}
                                className="w-4 h-4 rounded-full opacity-70"
                              />
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{new URL(analytics.url).hostname.replace('www.', '')}</span>
                            </div>

                            {/* 預覽標題 - 只顯示不可編輯（主標題已可編輯） */}
                            <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 text-lg group-hover/card:text-orange-600 transition-colors">
                              {(analytics.title && !analytics.title.includes('http') && !analytics.title.includes('www.') && analytics.title.length <= 100)
                                ? analytics.title
                                : new URL(analytics.url).hostname.toUpperCase()}
                            </h3>

                            {/* 預覽描述 - 可編輯 */}
                            <div className="group/desc">
                              {editingField === 'description' ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editValues.description}
                                    onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    rows={3}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      disabled={saving}
                                      className="bg-green-500 hover:bg-green-600 text-white"
                                    >
                                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCancelEdit}
                                      disabled={saving}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                                    {analytics.description || `This link redirects to ${new URL(analytics.url).hostname}. Analysis and tracking provided by OAO.TO.`}
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit('description');
                                    }}
                                    className="absolute -top-1 -right-1 opacity-0 group-hover/desc:opacity-100 transition-opacity p-1.5 bg-white rounded-lg shadow-md hover:bg-orange-50 text-orange-600"
                                    title="編輯描述"
                                  >
                                    <PenLine className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-center text-xs font-bold text-gray-300 mt-4 select-none tracking-widest uppercase">
                        預覽卡片
                      </p>
                      
                      {/* 圖片 URL 編輯 */}
                      {editingField === 'image' && (
                        <div className="mt-4 p-4 bg-white rounded-xl border-2 border-orange-200 shadow-lg space-y-3">
                          <label className="block text-sm font-semibold text-gray-700">
                            預覽圖片 URL
                          </label>
                          <Input
                            value={editValues.image}
                            onChange={(e) => setEditValues({ ...editValues, image: e.target.value })}
                            placeholder="https://example.com/image.png"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <p className="text-xs text-gray-500">建議尺寸：1200×630 像素</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" /> 儲存</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              disabled={saving}
                            >
                              <X className="w-4 h-4 mr-1.5" /> 取消
                            </Button>
                          </div>
                        </div>
                      )}
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
