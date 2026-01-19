import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  Mail, 
  MessageCircle, 
  Book, 
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export default function Support() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const faqs = [
    {
      question: 'How do I create a short link?',
      answer: 'Simply paste your long URL in the input box on the homepage and click "Shorten!". You can optionally customize the slug by clicking "Customize?" before submitting.'
    },
    {
      question: 'Can I edit or delete my links?',
      answer: 'Yes! Go to your Dashboard after logging in. You can view all your links, see analytics, and delete links you no longer need. Link editing (changing the destination URL) will be available in Pro plan.'
    },
    {
      question: 'How do I track link analytics?',
      answer: 'Click on any link in your Dashboard to view detailed analytics including clicks, geographic location, devices, browsers, and referrer sources. Analytics are updated in real-time.'
    },
    {
      question: 'Are there any limits on the free plan?',
      answer: 'The free plan allows 100 links per month with basic analytics and QR code generation. For unlimited links and advanced features, check out our Pro plan.'
    },
    {
      question: 'Can I use my own custom domain?',
      answer: 'Custom domains are available on the Pro and Enterprise plans. You can use your own branded domain (like links.yourbrand.com) instead of oao.to.'
    },
    {
      question: 'How long do short links last?',
      answer: 'Short links are permanent by default and will work forever unless you delete them. Pro users can set expiration dates for temporary links.'
    },
    {
      question: 'Is there an API available?',
      answer: 'Yes! API access is available for Enterprise customers. Contact our sales team for API documentation and integration support.'
    },
    {
      question: 'What happens if I cancel my subscription?',
      answer: 'Your existing links will continue to work, but you won\'t be able to create new links beyond the free tier limit. You can resubscribe anytime to regain full access.'
    },
    {
      question: 'How do I download QR codes?',
      answer: 'After creating a short link, a QR code is automatically generated. Right-click on the QR code and select "Save image as" to download it in PNG format.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely! We use industry-standard encryption (TLS/SSL) for all data in transit and at rest. We\'re GDPR compliant and never sell your data. Read our Privacy Policy for details.'
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormData({ ...formData, subject: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-green-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '4s' }} />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-100 text-blue-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <HelpCircle className="w-4 h-4" />
              We're Here to Help
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 mb-6">
              Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Center</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
              Find answers, get help, or reach out to our team. We're always happy to assist! 💙
            </p>
          </motion.div>

          {/* Contact Options */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-blue-100/50 rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Email Support</h3>
              <p className="text-gray-500 text-sm font-medium mb-3">Get help via email within 24 hours</p>
              <a href="mailto:support@oao.to" className="text-blue-500 font-bold text-sm hover:text-blue-600 transition-colors">
                support@oao.to
              </a>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-green-100/50 -rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group md:mt-8">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Live Chat</h3>
              <p className="text-gray-500 text-sm font-medium mb-3">Chat with us in real-time</p>
              <button className="text-green-500 font-bold text-sm hover:text-green-600 transition-colors">
                Coming Soon ✨
              </button>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-purple-100/50 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                <Book className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Documentation</h3>
              <p className="text-gray-500 text-sm font-medium mb-3">Guides and tutorials</p>
              <button className="text-purple-500 font-bold text-sm hover:text-purple-600 transition-colors">
                Browse Docs
              </button>
            </Card>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-16"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-gray-800 mb-4">
                Frequently Asked <span className="text-orange-500">Questions</span>
              </h2>
              <p className="text-gray-500 font-medium">Quick answers to common questions</p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-white border-2 border-gray-100 focus:border-orange-200 rounded-2xl outline-none text-gray-700 placeholder:text-gray-400 font-medium transition-all"
                />
              </div>
            </div>

            {/* FAQ Items */}
            <div className="max-w-3xl mx-auto space-y-4">
              {filteredFaqs.length === 0 ? (
                <Card className="p-8 bg-white/60 backdrop-blur-xl text-center">
                  <p className="text-gray-500 font-medium">
                    No FAQs found matching "{searchQuery}". Try a different search term or contact us directly!
                  </p>
                </Card>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <Card
                    key={index}
                    className="bg-white/60 backdrop-blur-xl border-white/60 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0 mt-1 rotate-3">
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-gray-800 text-lg">{faq.question}</h3>
                        </div>
                        {expandedFaq === index ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      {expandedFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 ml-11"
                        >
                          <p className="text-gray-600 font-medium leading-relaxed">{faq.answer}</p>
                        </motion.div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-gray-800 mb-4">
                Still Need <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Help?</span>
              </h2>
              <p className="text-gray-500 font-medium">Send us a message and we'll get back to you soon!</p>
            </div>

            <Card className="max-w-2xl mx-auto p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              {formSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-500 mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Message Sent! ✨</h3>
                  <p className="text-gray-600 font-medium">
                    We've received your message and will respond within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Your Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-12 px-4 bg-white border-2 border-gray-100 focus:border-orange-200 rounded-xl outline-none text-gray-700 font-medium transition-all"
                        placeholder="Joey"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-12 px-4 bg-white border-2 border-gray-100 focus:border-orange-200 rounded-xl outline-none text-gray-700 font-medium transition-all"
                        placeholder="joey@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-100 focus:border-orange-200 rounded-xl outline-none text-gray-700 font-medium transition-all"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-100 focus:border-orange-200 rounded-xl outline-none text-gray-700 font-medium transition-all resize-none"
                      placeholder="Tell us what you need help with..."
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 rounded-xl text-lg font-bold hover:scale-105 shadow-lg shadow-orange-500/20"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </Button>
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

