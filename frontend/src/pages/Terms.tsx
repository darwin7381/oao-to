import { motion } from 'framer-motion';
import { FileText, AlertTriangle, CheckCircle, XCircle, Scale, Mail } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';

export default function Terms() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-red-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-yellow-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '4s' }} />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-100 text-orange-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <Scale className="w-4 h-4" />
              Fair & Simple Rules
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 mb-6">
              Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">Service</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
              The legal stuff, but written in plain English. 📜
            </p>
            <p className="text-sm text-gray-400 mt-4">Effective date: January 19, 2026</p>
          </motion.div>

          {/* Quick Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-green-100/50 rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Use Responsibly</h3>
              <p className="text-gray-500 text-sm font-medium">Create links for legit purposes only.</p>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-red-100/50 -rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group md:mt-8">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">No Bad Stuff</h3>
              <p className="text-gray-500 text-sm font-medium">Spam, malware, and illegal content = banned.</p>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-blue-100/50 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">We're Fair</h3>
              <p className="text-gray-500 text-sm font-medium">We'll notify you before making changes.</p>
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
                  <h2 className="text-2xl font-black text-gray-800 mb-4">1. Acceptance of Terms</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>
                      By accessing or using OAO.TO ("the Service"), you agree to be bound by these Terms of Service.
                      If you don't agree with any part of these terms, please don't use our service.
                    </p>
                    <p>
                      We reserve the right to update these terms at any time. We'll notify you of significant changes
                      via email or through the service. Continued use after changes means you accept the new terms.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0 -rotate-3">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">2. Service Description</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>OAO.TO provides URL shortening services with the following features:</p>
                    <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                      <li>Shorten long URLs into compact, shareable links</li>
                      <li>Custom slug creation for branded links</li>
                      <li>QR code generation for each shortened link</li>
                      <li>Analytics and click tracking</li>
                      <li>Link management dashboard</li>
                    </ul>
                    <p className="mt-3">
                      We strive for 99.9% uptime but cannot guarantee uninterrupted service. We may need to perform
                      maintenance or updates that temporarily affect availability.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0 rotate-2">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">3. User Accounts</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p><strong className="text-gray-800">Account Creation:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>You must be at least 13 years old to use this service</li>
                      <li>You must provide accurate information during sign-up</li>
                      <li>One account per person (no multiple accounts for abuse)</li>
                      <li>You're responsible for keeping your account secure</li>
                    </ul>
                    <p className="mt-3"><strong className="text-gray-800">Account Termination:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>You can delete your account anytime from settings</li>
                      <li>We may suspend or terminate accounts that violate these terms</li>
                      <li>We'll notify you before termination unless it's for security/legal reasons</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0 -rotate-2">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">4. Prohibited Uses</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p className="font-bold text-red-600">You MAY NOT use OAO.TO to:</p>
                    <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                      <li><strong>Spam or Phishing:</strong> Send unsolicited emails or create phishing links</li>
                      <li><strong>Malware Distribution:</strong> Link to viruses, trojans, or malicious software</li>
                      <li><strong>Illegal Content:</strong> Link to illegal materials or services</li>
                      <li><strong>Adult Content:</strong> Link to pornography or sexually explicit materials</li>
                      <li><strong>Hate Speech:</strong> Promote violence, hatred, or discrimination</li>
                      <li><strong>Fraud:</strong> Deceive users or conduct fraudulent activities</li>
                      <li><strong>Copyright Infringement:</strong> Link to pirated content or violate IP rights</li>
                      <li><strong>System Abuse:</strong> Attempt to overload or exploit our infrastructure</li>
                      <li><strong>Link Cloaking:</strong> Hide the true destination to deceive users</li>
                    </ul>
                    <p className="mt-4 p-4 bg-red-50 rounded-2xl border-2 border-red-100 font-bold text-red-700">
                      ⚠️ Violation of these rules will result in immediate account suspension and link deletion.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-500 flex-shrink-0 rotate-3">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">5. Content Ownership</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p><strong className="text-gray-800">Your Content:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>You retain all rights to URLs and content you submit</li>
                      <li>You grant us license to store and display your links to provide the service</li>
                      <li>You're responsible for ensuring you have rights to share the content</li>
                    </ul>
                    <p className="mt-3"><strong className="text-gray-800">Our Content:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>OAO.TO, our logo, and interface are our property</li>
                      <li>You may not copy, modify, or reverse-engineer our service</li>
                      <li>All trademarks and copyrights belong to their respective owners</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600 flex-shrink-0 -rotate-3">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">6. Disclaimers & Limitations</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p><strong className="text-gray-800">Service "As Is":</strong></p>
                    <p>
                      OAO.TO is provided "as is" without warranties of any kind. We don't guarantee that:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>The service will be error-free or uninterrupted</li>
                      <li>Defects will be corrected immediately</li>
                      <li>The service meets your specific requirements</li>
                    </ul>
                    <p className="mt-3"><strong className="text-gray-800">Limitation of Liability:</strong></p>
                    <p>
                      We're not liable for any indirect, incidental, or consequential damages arising from:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Use or inability to use the service</li>
                      <li>Lost profits or data</li>
                      <li>Third-party content accessed through our links</li>
                    </ul>
                    <p className="mt-4 text-sm">
                      Some jurisdictions don't allow limitation of liability, so this may not apply to you.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 flex-shrink-0 rotate-2">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">7. Indemnification</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>
                      You agree to defend, indemnify, and hold harmless OAO.TO and its team from any claims,
                      damages, or expenses (including legal fees) arising from:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
                      <li>Your use of the service</li>
                      <li>Your violation of these terms</li>
                      <li>Your violation of any third-party rights</li>
                      <li>Content you submit or share</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0 -rotate-2">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">8. Governing Law</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>
                      These terms are governed by the laws of the jurisdiction where OAO.TO operates,
                      without regard to conflict of law provisions.
                    </p>
                    <p>
                      Any disputes will be resolved through binding arbitration, except where prohibited by law.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0 rotate-3">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">9. Contact & Questions</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>Questions about these terms? Concerns about content? We're here to help!</p>
                    <div className="mt-4 p-4 bg-orange-50 rounded-2xl border-2 border-orange-100">
                      <p className="font-bold text-gray-800 mb-2">Get in touch:</p>
                      <p className="text-sm">
                        <strong>Email:</strong>{' '}
                        <a href="mailto:legal@oao.to" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
                          legal@oao.to
                        </a>
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Abuse Reports:</strong>{' '}
                        <a href="mailto:abuse@oao.to" className="text-red-500 font-bold hover:text-red-600 transition-colors">
                          abuse@oao.to
                        </a>
                      </p>
                    </div>
                    <p className="text-sm mt-4">We typically respond within 48 hours. 💌</p>
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
            <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-100">
              <p className="text-gray-600 font-medium">
                <strong className="text-gray-800">Bottom Line:</strong> Be nice, don't spam, don't do illegal stuff,
                and we'll all get along great! 🎉
              </p>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


