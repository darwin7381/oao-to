import { motion } from 'framer-motion';
import { CreditCard, RotateCcw, XCircle, Mail, Clock } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';

export default function Refund() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
      </div>

      <Header />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-100 text-indigo-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <CreditCard className="w-4 h-4" />
              Billing & Refunds
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 mb-6">
              Refund <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Policy</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
              Simple and fair. Here's how billing, cancellation, and refunds work at OAO.TO.
            </p>
            <p className="text-sm text-gray-400 mt-4">Last updated: July 20, 2026</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-8"
          >
            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-500 flex-shrink-0 rotate-3">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">Subscriptions & Auto-Renewal</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Subscriptions are billed in advance (monthly or yearly) and <strong>renew automatically</strong> until cancelled</li>
                      <li>Cancel anytime from your dashboard — no questions asked</li>
                      <li>Cancellation takes effect at the <strong>end of your current billing period</strong>; you keep full access until then</li>
                      <li>We don't provide prorated refunds for the unused portion of a billing period</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0 -rotate-3">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">What's Not Refundable</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Completed billing periods (past months of a subscription)</li>
                      <li>Unused monthly quota or purchased credits</li>
                      <li>Accounts terminated for violating our <a href="/terms" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">Terms of Service</a> (e.g. phishing, malware, spam)</li>
                    </ul>
                    <p className="text-sm mt-3">
                      Exceptions apply where consumer protection law grants you mandatory refund rights.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-500 flex-shrink-0 rotate-3">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">When We Do Refund</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li><strong>Billing errors</strong> — duplicate charges, wrong amounts, or charges after cancellation: report within 14 days and we'll refund in full</li>
                      <li><strong>Extended outages</strong> — if a service failure on our side made the product unusable for a significant period, contact us and we'll work something out</li>
                      <li><strong>Legal requirements</strong> — where local law requires a refund, we comply</li>
                    </ul>
                    <p className="mt-3">
                      Approved refunds are issued to the <strong>original payment method</strong> via Stripe, typically within 5–10 business days. Credits granted by the refunded purchase are deducted from your account balance.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0 -rotate-3">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 mb-4">How to Request a Refund</h2>
                  <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
                    <p>
                      Email{' '}
                      <a href="mailto:billing@oao.to" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">billing@oao.to</a>{' '}
                      from your account email, or open a ticket from your dashboard. Include the charge date and amount — we typically respond within 48 hours.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
