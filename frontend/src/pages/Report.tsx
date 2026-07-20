import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';

const API_BASE = import.meta.env.PROD
  ? 'https://api.oao.to'
  : 'http://localhost:8788';

const REASONS = [
  { value: 'phishing', label: 'Phishing / credential theft' },
  { value: 'malware', label: 'Malware / virus' },
  { value: 'scam', label: 'Scam / fraud' },
  { value: 'spam', label: 'Spam' },
  { value: 'illegal', label: 'Illegal content' },
  { value: 'other', label: 'Other' },
];

export default function Report() {
  const [slug, setSlug] = useState('');
  const [reason, setReason] = useState('phishing');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          reason,
          details: details.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-red-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-orange-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
      </div>

      <Header />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-100 text-red-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <ShieldAlert className="w-4 h-4" />
              Keep OAO.TO Safe
            </div>
            <h1 className="text-5xl font-black text-gray-800 mb-6">
              Report a <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Link</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-xl mx-auto font-medium">
              Found a short link used for phishing, malware, or abuse? Let us know and we'll review it promptly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Card className="p-8 bg-white/80 backdrop-blur-xl border-2 border-red-100/50">
              {done ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-black text-gray-800 mb-2">Report received</h2>
                  <p className="text-gray-500 font-medium">
                    Thank you for helping keep OAO.TO safe. Our team will review this link shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Short link or slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="https://oao.to/abc123 or abc123"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none font-medium bg-white"
                    >
                      {REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Details <span className="text-gray-400 font-medium">(optional)</span>
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="What did this link do? Any additional context helps our review."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Your email <span className="text-gray-400 font-medium">(optional, for follow-up)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none font-medium"
                    />
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-red-400 to-orange-400 text-white font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flag className="w-5 h-5" />}
                    {submitting ? 'Submitting…' : 'Submit Report'}
                  </button>

                  <p className="text-xs text-gray-400 text-center font-medium">
                    You can also email us directly at abuse@oao.to
                  </p>
                </form>
              )}
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
