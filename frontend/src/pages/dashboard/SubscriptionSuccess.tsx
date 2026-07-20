import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSubscription } = useSubscription();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    // 只執行一次：重新整理訂閱
    refreshSubscription().catch(console.error);

    // 倒數計時
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/dashboard/credits');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-nunito">
      {/* 背景裝飾（符合專案風格）*/}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="bg-white rounded-3xl shadow-2xl p-12 max-w-lg w-full text-center relative"
      >
        {/* 成功圖示 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6"
        >
          <CheckCircle className="w-14 h-14 text-green-600" />
        </motion.div>

        {/* 標題 */}
        <h1 className="text-4xl font-black text-gray-900 mb-3">
          🎉 Payment Successful!
        </h1>
        
        <div className="mb-8">
          <p className="text-lg text-gray-600 mb-2">
            Your subscription is now active
          </p>
          <p className="text-sm text-gray-500">
            Your updated plan details will appear on the Credits page shortly.
          </p>
        </div>

        {/* 倒數 */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-3">
            Redirecting to Credits page in {countdown}s
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 to-pink-500"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </div>
        </div>

        {/* 按鈕 */}
        <button
          onClick={() => navigate('/dashboard/credits')}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 mb-3"
        >
          View Credits Now
        </button>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full text-gray-600 font-medium py-3 hover:text-gray-900 transition-colors"
        >
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
}
