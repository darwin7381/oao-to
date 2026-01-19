import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, AlertTriangle, Shield, ArrowRight, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function LinkPreview() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    // TODO: Fetch link data from API
    // For now, using mock data
    const fetchLinkData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLinkData({
          shortUrl: `https://oao.to/${slug}`,
          originalUrl: 'https://www.example.com/very/long/url/path/to/content',
          createdAt: new Date().toISOString(),
          clicks: 1234,
          safe: true
        });
      } catch (error) {
        console.error('Error fetching link data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkData();
  }, [slug]);

  useEffect(() => {
    if (!loading && linkData && autoRedirect && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = linkData.originalUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, linkData, autoRedirect, countdown]);

  const handleContinue = () => {
    if (linkData) {
      window.location.href = linkData.originalUrl;
    }
  };

  const handleCancel = () => {
    setAutoRedirect(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-nunito">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Loading link preview...</p>
        </div>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-nunito px-6">
        <Card className="max-w-md p-8 bg-white/80 backdrop-blur-xl text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500 mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Link Not Found</h2>
          <p className="text-gray-600 font-medium mb-6">
            This short link doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/')} className="w-full h-12 rounded-xl font-bold">
            Go to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito flex items-center justify-center px-6">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-orange-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '4s' }} />
      </div>

      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 md:p-12 bg-white/80 backdrop-blur-xl border-white/60 shadow-2xl">
            {/* Safety Badge */}
            <div className="text-center mb-8">
              {linkData.safe ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-100 text-green-600 rounded-full text-sm font-bold mb-4">
                  <Shield className="w-4 h-4" />
                  Safe Link Verified
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-100 text-red-600 rounded-full text-sm font-bold mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  Caution Advised
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">
                Link Preview 🔗
              </h1>
              <p className="text-gray-600 font-medium mb-6">
                You're about to visit the following destination:
              </p>

              {/* Short URL */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 font-bold mb-2">From:</p>
                <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-100">
                  <p className="text-orange-600 font-black text-lg break-all">
                    {linkData.shortUrl}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Original URL */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 font-bold mb-2">To:</p>
                <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                  <p className="text-blue-600 font-bold break-all">
                    {linkData.originalUrl}
                  </p>
                </div>
              </div>

              {/* Auto-redirect countdown */}
              {autoRedirect && countdown > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-orange-100 rounded-full">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-gray-700">
                      Redirecting in <span className="text-orange-500 text-xl">{countdown}</span>s
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-8">
                <div>
                  <span className="font-bold text-gray-700">{linkData.clicks.toLocaleString()}</span> clicks
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <div>
                  Created {new Date(linkData.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleContinue}
                size="lg"
                className="flex-1 h-14 rounded-xl text-lg font-bold hover:scale-105 shadow-lg shadow-orange-500/20"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Continue to Link
              </Button>
              <Button
                onClick={handleCancel}
                variant="secondary"
                size="lg"
                className="flex-1 h-14 rounded-xl text-lg font-bold hover:scale-105"
              >
                Cancel
              </Button>
            </div>

            {/* Safety Notice */}
            {!linkData.safe && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-bold text-yellow-800 text-sm mb-1">Proceed with Caution</p>
                    <p className="text-yellow-700 text-sm">
                      This link hasn't been verified. Make sure you trust the source before continuing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Notice */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400 font-medium">
                Link previews help protect you from malicious URLs. Always verify before clicking!
              </p>
            </div>
          </Card>

          {/* Bottom Link */}
          <div className="text-center mt-8">
            <a
              href="/"
              className="text-sm text-gray-500 font-bold hover:text-orange-500 transition-colors"
            >
              ← Back to OAO.TO
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

