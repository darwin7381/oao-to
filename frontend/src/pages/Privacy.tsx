import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, FileText, Mail } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';

export default function Privacy() {
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
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-100 text-blue-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <Shield className="w-4 h-4" />
              Your Privacy Matters
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 mb-6">
              Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Policy</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
              We take your privacy seriously. Here's how we protect your data.
            </p>
            <p className="text-sm text-gray-400 mt-4">Last updated: January 19, 2026</p>
          </motion.div>

          {/* Quick Overview Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-blue-100/50 rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Encrypted</h3>
              <p className="text-gray-500 text-sm font-medium">All data encrypted in transit and at rest.</p>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-purple-100/50 -rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group md:mt-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Transparent</h3>
              <p className="text-gray-500 text-sm font-medium">You know exactly what data we collect.</p>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-pink-100/50 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-500 mb-4 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Your Control</h3>
              <p className="text-gray-500 text-sm font-medium">Delete your data anytime, no questions asked.</p>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-8"
          >
            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0 rotate-3">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">Information We Collect</h2>
                  <div className="space-y-4 text-gray-600 font-medium leading-relaxed">
                    <div>
                      <h3 className="font-bold text-gray-800 mb-2">Account Information</h3>
                      <p>When you sign up with Google OAuth, we collect:</p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>Your email address</li>
                        <li>Your name and profile picture</li>
                        <li>Google account ID</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-gray-800 mb-2">Link Data</h3>
                      <p>When you create shortened links, we store:</p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>Original URLs and shortened slugs</li>
                        <li>Creation timestamps</li>
                        <li>Custom slugs you create</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-800 mb-2">Analytics Data</h3>
                      <p>When someone clicks your links, we collect:</p>
                      <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                        <li>Click timestamps</li>
                        <li>Referrer information</li>
                        <li>Device type and browser</li>
                        <li>Approximate location (country/city)</li>
                        <li>IP addresses (anonymized)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0 -rotate-3">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">How We Use Your Information</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p><strong className="text-gray-800">Provide Services:</strong> To create, manage, and track your shortened links.</p>
                    <p><strong className="text-gray-800">Analytics:</strong> To show you insights about link performance.</p>
                    <p><strong className="text-gray-800">Security:</strong> To detect and prevent abuse, spam, and malicious activity.</p>
                    <p><strong className="text-gray-800">Communication:</strong> To send important service updates (we hate spam too!).</p>
                    <p><strong className="text-gray-800">Improvements:</strong> To enhance our service and develop new features.</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0 rotate-2">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">Data Security</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>We implement industry-standard security measures:</p>
                    <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                      <li><strong>Encryption:</strong> All data is encrypted in transit (TLS/SSL) and at rest.</li>
                      <li><strong>Authentication:</strong> Secure OAuth 2.0 authentication via Google.</li>
                      <li><strong>Infrastructure:</strong> Hosted on Cloudflare's global network with DDoS protection.</li>
                      <li><strong>Access Control:</strong> Strict access controls limit who can access your data.</li>
                      <li><strong>Regular Audits:</strong> We regularly review our security practices.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-500 flex-shrink-0 -rotate-2">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">Your Rights</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>You have complete control over your data:</p>
                    <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                      <li><strong>Access:</strong> View all your data at any time through your dashboard.</li>
                      <li><strong>Correction:</strong> Update your information whenever needed.</li>
                      <li><strong>Deletion:</strong> Delete your account and all associated data permanently.</li>
                      <li><strong>Export:</strong> Request a copy of your data in machine-readable format.</li>
                      <li><strong>Opt-out:</strong> Unsubscribe from marketing emails (we rarely send them anyway!).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 flex-shrink-0 rotate-3">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">Data Sharing</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p className="font-bold text-orange-600">We DO NOT sell your personal data. Period.</p>
                    <p>We only share data in these limited circumstances:</p>
                    <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                      <li><strong>Service Providers:</strong> Cloudflare for hosting and infrastructure.</li>
                      <li><strong>Legal Requirements:</strong> When required by law or to protect our rights.</li>
                      <li><strong>With Your Consent:</strong> When you explicitly authorize us to share.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600 flex-shrink-0 -rotate-3">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">Cookies & Tracking</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>We use minimal cookies for essential functionality:</p>
                    <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                      <li><strong>Authentication:</strong> To keep you logged in.</li>
                      <li><strong>Preferences:</strong> To remember your settings.</li>
                      <li><strong>Analytics:</strong> To understand how people use our service (anonymized).</li>
                    </ul>
                    <p className="mt-3">You can disable cookies in your browser, but some features may not work.</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0 rotate-2">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">Contact Us</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>Have questions about your privacy? We're here to help!</p>
                    <div className="mt-4 p-4 bg-orange-50 rounded-2xl border-2 border-orange-100">
                      <p className="font-bold text-gray-800">Email:</p>
                      <a href="mailto:privacy@oao.to" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
                        privacy@oao.to
                      </a>
                    </div>
                    <p className="text-sm mt-4">We'll respond within 48 hours. ✨</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <Card className="p-6 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-100">
              <p className="text-gray-600 font-medium">
                <strong className="text-gray-800">TL;DR:</strong> We collect only what's necessary, keep it secure, never sell it, and you can delete it anytime. 💙
              </p>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

