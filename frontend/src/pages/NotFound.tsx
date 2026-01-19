import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft, HelpCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito flex items-center justify-center">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-orange-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '4s' }} />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Large Number */}
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 10,
              delay: 0.2 
            }}
            className="mb-8"
          >
            <h1 className="text-[200px] md:text-[280px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 select-none">
              404
            </h1>
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-6 mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-100 text-orange-500 rounded-full text-sm font-bold shadow-sm mb-4">
              <HelpCircle className="w-4 h-4" />
              Oops! Page Not Found
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black text-gray-800 mb-4">
              This page went on vacation! 🏖️
            </h2>
            
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
              We looked everywhere, but couldn't find what you're looking for.
              The link might be broken, or the page may have been removed.
            </p>
          </motion.div>

          {/* Action Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-orange-100/50 rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate('/')}>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 mb-4 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-transform">
                <Home className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Go Home</h3>
              <p className="text-gray-500 text-sm font-medium">Start fresh from the homepage</p>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-blue-100/50 -rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer group md:mt-8"
              onClick={() => navigate(-1)}>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500 mb-4 mx-auto group-hover:scale-110 group-hover:-rotate-12 transition-transform">
                <ArrowLeft className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Go Back</h3>
              <p className="text-gray-500 text-sm font-medium">Return to previous page</p>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-xl border-2 border-pink-100/50 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate('/dashboard')}>
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-500 mb-4 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">Dashboard</h3>
              <p className="text-gray-500 text-sm font-medium">Check your links and analytics</p>
            </Card>
          </motion.div>

          {/* Main CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/">
              <Button
                size="lg"
                className="h-16 px-10 rounded-2xl text-lg font-bold hover:scale-105 shadow-xl shadow-orange-500/20"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link to="/support">
              <Button
                size="lg"
                variant="secondary"
                className="h-16 px-10 rounded-2xl text-lg font-bold hover:scale-105"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Get Help
              </Button>
            </Link>
          </motion.div>

          {/* Fun Suggestions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="mt-16"
          >
            <Card className="p-6 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-100 inline-block">
              <p className="text-gray-600 font-medium text-sm">
                <strong className="text-gray-800">Suggested:</strong> Try checking the URL for typos, or{' '}
                <Link to="/" className="text-orange-500 font-bold hover:text-orange-600 underline">
                  create a short link
                </Link>{' '}
                instead! ✨
              </p>
            </Card>
          </motion.div>

          {/* Cute Illustration Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mt-12 text-6xl"
          >
            🔍🤷‍♀️
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

