import { motion } from 'framer-motion';
import { 
  Link as LinkIcon, 
  QrCode, 
  BarChart3, 
  Zap, 
  Shield, 
  Globe, 
  Smartphone,
  Clock,
  Users,
  Target,
  Eye,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function FeaturesPage() {
  const mainFeatures = [
    {
      icon: LinkIcon,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-100',
      borderColor: 'border-orange-100',
      title: 'Custom Short Links',
      description: 'Create branded, memorable links with custom slugs instead of random characters.',
      details: [
        'Choose your own slug names',
        'Auto-generated suggestions',
        'Instant availability check',
        'Bulk link creation'
      ]
    },
    {
      icon: QrCode,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-100',
      borderColor: 'border-purple-100',
      title: 'QR Code Generation',
      description: 'Instantly generate beautiful, scannable QR codes for every shortened link.',
      details: [
        'High-resolution downloads',
        'Customizable sizes',
        'Multiple formats (PNG, SVG)',
        'Perfect for print marketing'
      ]
    },
    {
      icon: BarChart3,
      iconColor: 'text-pink-500',
      iconBg: 'bg-pink-100',
      borderColor: 'border-pink-100',
      title: 'Powerful Analytics',
      description: 'Track clicks, locations, devices, and referrers with detailed real-time analytics.',
      details: [
        'Real-time click tracking',
        'Geographic insights',
        'Device & browser stats',
        'Referrer tracking'
      ]
    },
    {
      icon: Zap,
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-100',
      borderColor: 'border-yellow-100',
      title: 'Lightning Fast',
      description: 'Powered by Cloudflare\'s global edge network for sub-10ms redirects worldwide.',
      details: [
        'Global CDN distribution',
        '<10ms redirect time',
        '99.99% uptime SLA',
        'DDoS protection included'
      ]
    },
    {
      icon: Shield,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      borderColor: 'border-blue-100',
      title: 'Secure & Private',
      description: 'Enterprise-grade security with OAuth authentication and encrypted data storage.',
      details: [
        'Google OAuth 2.0',
        'End-to-end encryption',
        'GDPR compliant',
        'Regular security audits'
      ]
    },
    {
      icon: Globe,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100',
      borderColor: 'border-green-100',
      title: 'Custom Domains',
      description: 'Use your own domain for short links to strengthen your brand identity.',
      details: [
        'Bring your own domain',
        'SSL certificates included',
        'Easy DNS setup',
        'Multiple domains support'
      ],
      badge: 'Pro'
    }
  ];

  const additionalFeatures = [
    { icon: Clock, text: 'Link expiration & scheduling' },
    { icon: Users, text: 'Team collaboration & sharing' },
    { icon: Target, text: 'Geographic targeting' },
    { icon: Eye, text: 'Password-protected links' },
    { icon: Settings, text: 'API access for developers' },
    { icon: Smartphone, text: 'Mobile-optimized dashboard' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '4s' }} />
      </div>

      <Header />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-100 text-orange-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <Zap className="w-4 h-4 fill-current" />
              All Features at a Glance
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 mb-6">
              Everything You Need to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400">
                Manage Your Links
              </span>
            </h1>
            <p className="text-xl text-gray-500 max-w-3xl mx-auto font-medium leading-relaxed">
              From basic URL shortening to advanced analytics and team collaboration,
              we've got all the features to power your link strategy. ✨
            </p>
          </motion.div>

          {/* Main Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
          >
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.6 }}
              >
                <Card className={`
                  relative p-8 bg-white/80 backdrop-blur-xl border-2 
                  ${feature.borderColor} hover:border-opacity-100
                  hover:-translate-y-2 hover:shadow-2xl
                  transition-all duration-300 group h-full
                `}>
                  {feature.badge && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-orange-400 to-pink-400 text-white text-xs font-black rounded-full">
                      {feature.badge}
                    </div>
                  )}

                  <div className={`
                    w-14 h-14 rounded-2xl ${feature.iconBg} 
                    flex items-center justify-center ${feature.iconColor} 
                    mb-6 group-hover:scale-110 group-hover:rotate-12 
                    transition-transform duration-300
                  `}>
                    <feature.icon className="w-7 h-7" />
                  </div>

                  <h3 className="text-2xl font-black text-gray-800 mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 font-medium mb-6 leading-relaxed">
                    {feature.description}
                  </p>

                  <ul className="space-y-2">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                        <span className="text-gray-700 font-medium">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Additional Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-gray-800 mb-4">
                And There's <span className="text-orange-500">More!</span>
              </h2>
              <p className="text-gray-500 font-medium">
                Even more features to supercharge your workflow
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {additionalFeatures.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * index, duration: 0.4 }}
                >
                  <Card className="p-6 bg-white/60 backdrop-blur-xl border-white/60 hover:bg-white/80 hover:shadow-lg transition-all duration-300 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <span className="text-gray-800 font-bold">{feature.text}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Use Cases Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-gray-800 mb-4">
                Perfect For <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Everyone</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl hover:-translate-y-1 transition-transform">
                <div className="text-3xl mb-4">📱</div>
                <h3 className="text-2xl font-black text-gray-800 mb-3">Social Media Marketers</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  Track campaign performance, create branded links, and optimize your social media strategy with detailed analytics.
                </p>
              </Card>

              <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl hover:-translate-y-1 transition-transform">
                <div className="text-3xl mb-4">🎨</div>
                <h3 className="text-2xl font-black text-gray-800 mb-3">Content Creators</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  Share beautiful, memorable links in your bio, videos, and posts. Perfect for YouTube, Instagram, and TikTok.
                </p>
              </Card>

              <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl hover:-translate-y-1 transition-transform">
                <div className="text-3xl mb-4">🏢</div>
                <h3 className="text-2xl font-black text-gray-800 mb-3">Businesses & Teams</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  Collaborate with your team, use custom domains, and maintain brand consistency across all marketing channels.
                </p>
              </Card>

              <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl hover:-translate-y-1 transition-transform">
                <div className="text-3xl mb-4">💻</div>
                <h3 className="text-2xl font-black text-gray-800 mb-3">Developers</h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  Integrate link shortening into your apps with our powerful API. Full documentation and examples included.
                </p>
              </Card>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-center"
          >
            <Card className="p-12 bg-gradient-to-r from-orange-400 to-pink-500 text-white border-white/20 shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-black mb-4">Ready to try it out?</h2>
              <p className="text-xl text-white/90 mb-8 font-medium max-w-2xl mx-auto">
                Start shortening links, tracking clicks, and growing your brand today. It's free to get started!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-16 px-10 rounded-2xl text-lg font-bold bg-white text-orange-500 hover:bg-white/90 hover:scale-105 shadow-xl"
                  >
                    Start For Free
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button
                    size="lg"
                    className="h-16 px-10 rounded-2xl text-lg font-bold bg-white/20 hover:bg-white/30 border-2 border-white/40 hover:scale-105"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

