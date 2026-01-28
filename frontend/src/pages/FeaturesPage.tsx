import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Link as LinkIcon,
  QrCode,
  BarChart3,
  Zap,
  Shield,
  Globe,
  Smartphone,
  Sparkles,
  MousePointer2,
  Lock,
  Share2,
  Code2,
  Check,
  ArrowRight,
  Terminal,
  Globe2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { useRef } from 'react';

// --- Sub-components (Visuals) ---

const FakeBrowser = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("rounded-xl overflow-hidden border border-black/5 shadow-2xl bg-white", className)}>
    <div className="h-8 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2">
      <div className="w-3 h-3 rounded-full bg-red-400/80" />
      <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
      <div className="w-3 h-3 rounded-full bg-green-400/80" />
      <div className="ml-4 flex-1 h-5 bg-white border border-gray-200 rounded-md shadow-sm" />
    </div>
    <div className="p-4 md:p-6 bg-gray-50/50">
      {children}
    </div>
  </div>
);

const CodeBlock = () => (
  <div className="rounded-xl overflow-hidden bg-[#1E1E1E] shadow-2xl border border-white/10 text-xs md:text-sm font-mono leading-relaxed text-blue-300">
    <div className="h-8 bg-[#2D2D2D] border-b border-white/5 flex items-center px-4 gap-2">
      <div className="w-3 h-3 rounded-full bg-red-500/80" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
      <div className="w-3 h-3 rounded-full bg-green-500/80" />
      <span className="ml-2 text-gray-500 font-sans text-xs">POST /v1/shorten</span>
    </div>
    <div className="p-6 overflow-x-auto">
      <div className="text-gray-400 mb-2">{"// Request"}</div>
      <div>
        <span className="text-purple-400">await</span> <span className="text-yellow-300">fetch</span>('<span className="text-green-300">https://api.oao.to/shorten</span>', {'{'}
      </div>
      <div className="pl-4">
        method: '<span className="text-green-300">POST</span>',
      </div>
      <div className="pl-4">
        body: JSON.<span className="text-yellow-300">stringify</span>({'{'}
      </div>
      <div className="pl-8">
        url: '<span className="text-green-300">https://very-long-url.com/awesome-product</span>',
      </div>
      <div className="pl-8">
        slug: '<span className="text-green-300">super-sale</span>'
      </div>
      <div className="pl-4">
        {'}'})
      </div>
      <div>{'}'});</div>
      <br />
      <div className="text-gray-400 mb-2">{"// Response (200 OK)"}</div>
      <div className="text-gray-300">{'{'}</div>
      <div className="pl-4">
        "shortUrl": "<span className="text-green-300">https://oao.to/super-sale</span>",
      </div>
      <div className="pl-4">
        "qrCode": "<span className="text-green-300">data:image/png;base64...</span>",
      </div>
      <div className="pl-4">
        "analytics": {'{'} "trackId": "<span className="text-blue-300">evt_8x92...</span>" {'}'}
      </div>
      <div className="text-gray-300">{'}'}</div>
    </div>
  </div>
);

export default function FeaturesPage() {
  const scrollRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });

  // Parallax for Hero
  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito selection:bg-orange-100 selection:text-orange-900">
      <Header />

      {/* 1. HERO SECTION: "The Sweetest Links" */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Background Blobs - Hero Specific */}
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-orange-100/50 to-pink-100/50 rounded-full blur-[100px] opacity-70" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Interactive Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-white border border-orange-100 text-orange-600 rounded-full text-sm font-black shadow-lg shadow-orange-100 mb-8 cursor-pointer hover:scale-105 transition-transform"
          >
            <Sparkles className="w-4 h-4 text-yellow-500 fill-current animate-pulse" />
            <span>Feature-Packed Release v2.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-gray-900 mb-8 leading-tight tracking-tight"
          >
            More than just <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 relative">
              a pretty link.
              {/* Decor lines */}
              <svg className="absolute -bottom-4 left-0 w-full h-4 text-orange-300/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto font-medium leading-relaxed mb-12"
          >
            OAO.TO combines enterprise-grade power with a <span className="text-gray-800 font-bold">delightful</span> user experience.
            Manage, track, and scale your links without the boring corporate interface.
          </motion.p>

          {/* Orbiting Visuals (Conceptual) */}
          <div className="relative w-full max-w-4xl mx-auto h-[400px] md:h-[500px] mt-12 hidden md:block">
            {/* Central Sphere */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/30 text-white z-20"
            >
              <span className="text-4xl font-black tracking-tighter">OAO</span>
            </motion.div>

            {/* Orbiting Item 1: Link */}
            <motion.div
              style={{ y: yHero }}
              className="absolute top-[10%] left-[20%] p-6 bg-white rounded-3xl shadow-xl shadow-blue-200/50 border border-blue-100 z-10"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-xl"><LinkIcon className="text-blue-500" /></div>
                <div>
                  <div className="w-32 h-3 bg-gray-100 rounded-full mb-2" />
                  <div className="w-20 h-3 bg-gray-100 rounded-full" />
                </div>
              </div>
            </motion.div>

            {/* Orbiting Item 2: Chart */}
            <motion.div
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[20%] right-[15%] p-6 bg-white rounded-3xl shadow-xl shadow-pink-200/50 border border-pink-100 z-10"
            >
              <div className="flex items-end gap-2 h-16 w-48">
                <div className="w-1/5 bg-pink-200 rounded-t-lg h-[40%]" />
                <div className="w-1/5 bg-pink-300 rounded-t-lg h-[70%]" />
                <div className="w-1/5 bg-pink-400 rounded-t-lg h-[50%]" />
                <div className="w-1/5 bg-pink-500 rounded-t-lg h-[90%]" />
                <div className="w-1/5 bg-pink-600 rounded-t-lg h-[65%]" />
              </div>
            </motion.div>

            {/* Orbiting Item 3: QR */}
            <motion.div
              animate={{ x: [0, 10, 0], y: [0, 15, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute top-[20%] right-[25%] p-4 bg-white rounded-3xl shadow-xl shadow-purple-200/50 border border-purple-100 z-0"
            >
              <QrCode className="w-12 h-12 text-purple-500" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. LINK MANAGEMENT (Zig-Zag) */}
      <section className="py-24 bg-white/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          {/* Text Left */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="mb-4 inline-flex items-center gap-2 text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-lg">
              <LinkIcon className="w-4 h-4" /> Link Management
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Links that look like <br /> <span className="text-orange-500">you designed them.</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Say goodbye to `bit.ly/3x9zK2`. Create meaningful, memorable links using your own custom slugs. Organize them with tags, edit destinations anytime, and manage everything from a centralized dashboard.
            </p>
            <ul className="space-y-4">
              {[
                "Custom Slugs (e.g. oao.to/summer-sale)",
                "Bulk Creation Tools",
                "Link Tagging & Filtering",
                "Destination Editing (Fix 404s)"
              ].map(item => (
                <li key={item} className="flex items-center gap-3 font-bold text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Check className="w-3 h-3" /></div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Visual Right */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative"
          >
            {/* Abstract decoration */}
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-200 to-yellow-100 rounded-[2rem] rotate-3 opacity-50 blur-2xl" />

            <FakeBrowser>
              <div className="space-y-3">
                {/* Mock Link Items */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500 font-bold">O</div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">oao.to/design-kit</div>
                      <div className="text-xs text-gray-400">figma.com/files/...</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-green-100 text-green-600 text-xs font-bold rounded">Active</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500 font-bold">M</div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">oao.to/meeting</div>
                      <div className="text-xs text-gray-400">meet.google.com/...</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">0 clicks</div>
                </div>
                {/* Floating "New Link" Modal */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 bg-white rounded-xl shadow-2xl border border-gray-100 p-4">
                  <div className="text-sm font-bold text-gray-400 mb-1">Destination URL</div>
                  <div className="h-8 bg-gray-100 rounded-md mb-3" />
                  <div className="text-sm font-bold text-gray-400 mb-1">Custom Slug</div>
                  <div className="flex gap-2">
                    <div className="h-8 w-1/3 bg-gray-100 rounded-md" />
                    <div className="h-8 w-2/3 bg-orange-50 border border-orange-200 rounded-md flex items-center px-2 text-orange-600 text-xs font-bold">summer-promo</div>
                  </div>
                  <div className="mt-4 w-full h-8 bg-orange-500 rounded-md" />
                </div>
              </div>
            </FakeBrowser>
          </motion.div>
        </div>
      </section>

      {/* 3. ANALYTICS (Full Width) */}
      <section className="py-24 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white -z-10" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="mb-4 inline-flex items-center gap-2 text-pink-600 font-bold bg-pink-50 px-3 py-1 rounded-lg">
              <BarChart3 className="w-4 h-4" /> Insightful Analytics
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Data you can actually <br /><span className="text-pink-500">fall in love with.</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              No more boring spreadsheets. Our dashboards are designed to be beautiful, actionable, and easy to understand at a glance.
            </p>
          </div>

          {/* Mock Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-gray-200 shadow-2xl bg-white/80 backdrop-blur-xl p-6 md:p-8"
          >
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {/* Stats Cards */}
              {[
                { label: 'Total Clicks', val: '24,592', color: 'text-gray-900', trend: '+12%' },
                { label: 'Top Referrer', val: 'Instagram', color: 'text-pink-500', trend: '45%' },
                { label: 'Conversion', val: '3.2%', color: 'text-blue-500', trend: '+0.5%' },
                { label: 'Active Links', val: '128', color: 'text-orange-500', trend: 'All time' },
              ].map((stat, i) => (
                <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-sm text-gray-400 font-bold mb-1">{stat.label}</div>
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.val}</div>
                  <div className="text-xs text-green-500 font-bold mt-2">↑ {stat.trend}</div>
                </div>
              ))}
            </div>

            {/* Big Chart Area */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-[300px] flex items-end gap-2 relative">
              {/* Grid Lines */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
                {[1, 2, 3, 4].map(line => <div key={line} className="w-full h-px bg-gray-50" />)}
              </div>
              {/* Bars */}
              {[35, 50, 45, 70, 60, 85, 95, 75, 60, 50, 65, 80, 55, 40].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  transition={{ delay: i * 0.05, duration: 0.8, type: 'spring' }}
                  className="flex-1 bg-gradient-to-t from-pink-500/80 to-pink-400 rounded-t-sm hover:from-pink-600 hover:to-pink-500 transition-colors"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. QR STUDIO (Grid) */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-16 items-center mb-16">
            {/* Text Side */}
            <div className="md:w-1/2">
              <div className="mb-4 inline-flex items-center gap-2 text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-lg">
                <QrCode className="w-4 h-4" /> QR Studio
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                Bridging Physical & <br /><span className="text-purple-500">Digital Worlds.</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Every link comes with a high-res QR code. But not just any black-and-white square. Customize colors, add logos, and match your brand aesthetic perfect for print, packaging, and events.
              </p>
              <Button variant="secondary" className="gap-2">
                Try QR Generator <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            {/* Grid Side */}
            <div className="md:w-1/2 grid grid-cols-2 gap-4">
              <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-50 rounded-3xl p-6 flex items-center justify-center aspect-square">
                <QrCode className="w-24 h-24 text-purple-600" />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="bg-orange-50 rounded-3xl p-6 flex items-center justify-center aspect-square">
                <QrCode className="w-24 h-24 text-orange-500 mix-blend-multiply" />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="bg-gray-900 rounded-3xl p-6 flex items-center justify-center aspect-square">
                <QrCode className="w-24 h-24 text-white" />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="bg-blue-50 rounded-3xl p-6 flex items-center justify-center aspect-square relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-teal-400 opacity-20" />
                <QrCode className="w-24 h-24 text-blue-600 relative z-10" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BRAND DOMAINS (Zig-Zag Right) */}
      <section className="py-24 bg-gray-50/50 relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          {/* Visual Left */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 md:order-1 relative"
          >
            <div className="absolute inset-0 bg-blue-100 rounded-full blur-[80px] opacity-60" />
            <Card className="p-10 bg-white/90 backdrop-blur-xl border-2 border-blue-50 relative z-10 text-center">
              <div className="flex items-center justify-center gap-4 text-2xl font-mono font-bold text-gray-400 mb-4 opacity-50 line-through decoration-red-400">
                oao.to/my-link
              </div>
              <div className="flex justify-center mb-4">
                <motion.div
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-blue-200"
                >
                  ↓
                </motion.div>
              </div>
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-500 text-white rounded-xl text-2xl font-bold shadow-lg shadow-blue-500/30">
                <Globe2 className="w-6 h-6" />
                link.mybrand.com
                <Shield className="w-5 h-5 ml-2 text-blue-200" />
              </div>
              <div className="mt-4 text-sm text-gray-500 font-medium">SSL Certificate Auto-Provisioned ✅</div>
            </Card>
          </motion.div>

          {/* Text Right */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 md:order-2"
          >
            <div className="mb-4 inline-flex items-center gap-2 text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg">
              <Globe className="w-4 h-4" /> Custom Domains
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Your Brand,<br /> Front and Center.
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Don't dilute your brand with generic short links. Connect your own domain (like `links.nike.com`) in seconds. We handle the SSL certificates, hosting, and redirects automatically.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200">
              Start Branding Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 6. DEVELOPER API (Dark Mode) */}
      <section className="py-24 bg-[#111] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-900/20 rounded-full blur-[100px]" />

        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1 rounded-lg border border-yellow-400/20">
              <Terminal className="w-4 h-4" /> Developer First
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              A Powerful API for <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Builders.</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Integrate OAO's shortening, tracking, and QR generation directly into your own applications. Restful endpoints, predictable JSON responses, and high rate limits.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-white mb-1">99.99%</div>
                <div className="text-sm text-gray-500">Uptime SLA</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-white mb-1">&lt; 10ms</div>
                <div className="text-sm text-gray-500">Latency</div>
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <Button variant="secondary" className="bg-white text-black hover:bg-gray-200">Read the Docs</Button>
              <Button variant="outline" className="text-gray-300 border-gray-700 hover:bg-gray-800">Get API Key</Button>
            </div>
          </div>

          {/* Code Block Visual */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <CodeBlock />
          </motion.div>
        </div>
      </section>

      {/* 7. GLOBAL SCALE & CTA */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">Trusted by 10,000+ Creators</h2>
            <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Fake Logos */}
              {["Acme Corp", "GlobalTech", "IndieBrand", "SuperStar"].map(logo => (
                <span key={logo} className="text-2xl font-black text-gray-300">{logo}</span>
              ))}
            </div>
          </div>

          <Card className="p-16 bg-gradient-to-br from-orange-500 to-pink-600 text-white rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black mb-6">Ready to get started?</h2>
              <p className="text-xl text-white/90 mb-10 font-medium max-w-2xl mx-auto">
                Join the community of marketers and developers making the web a little cuter, one link at a time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/">
                  <Button size="lg" variant="secondary" className="h-16 px-12 text-xl rounded-full bg-white text-orange-600 hover:bg-gray-50 shadow-xl">
                    Create Free Account
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-white/60">No credit card required • Free forever plan available</p>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
