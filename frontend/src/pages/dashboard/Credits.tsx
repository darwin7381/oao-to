import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  CreditCard,
  Sparkles,
  RefreshCcw,
  Zap,
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

interface CreditInfo {
  balance: {
    total: number;
    subscription: number;
    purchased: number;
  };
  plan: {
    type: string;
    renewedAt?: number;
    monthlyQuota: number;
    monthlyUsed: number;
    monthlyRemaining: number;
    monthlyResetAt?: number;
  };
  overage: {
    limit: number;
    used: number;
    remaining: number;
    rate: number;
  };
  statistics: {
    totalPurchased: number;
    totalUsed: number;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: number;
}

export default function Credits() {
  const { token } = useAuth();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

  useEffect(() => {
    const fetchData = async () => {
      console.log('[Credits] Fetching data...');
      try {
        const [creditsRes, txRes] = await Promise.all([
          fetch(`${apiUrl}/api/account/credits`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/account/transactions?limit=20`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (creditsRes.ok) {
          const data = await creditsRes.json();
          setCreditInfo(data.data);
        }

        if (txRes.ok) {
          const data = await txRes.json();
          setTransactions(data.data.transactions);
        }
      } catch (error) {
        console.error('Failed to load credits data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData().catch((error) => {
      console.error('[Credits] Unhandled error in fetchData:', error);
    });
  }, [apiUrl, token]);


  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'enterprise': return 'bg-gradient-to-r from-slate-900 to-slate-700 text-white';
      case 'pro': return 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white';
      case 'starter': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'free': default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  if (!creditInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Failed to load credit info</h3>
        <p className="text-gray-500 mt-2">Please try refreshing the page later.</p>
      </div>
    );
  }

  const quotaPercentage = Math.min(100, (creditInfo.plan.monthlyUsed / creditInfo.plan.monthlyQuota) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
          Credits & Usage
        </h1>
        <p className="text-lg text-gray-500 font-medium max-w-2xl">
          Monitor your API usage, track your credit balance, and view transaction history in real-time.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">

        {/* Total Balance - Large Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 lg:col-span-2"
        >
          <div className="h-full rounded-xl shadow-xl overflow-hidden relative bg-gradient-to-br from-orange-400 to-pink-500 text-white p-8 flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <Sparkles className="w-40 h-40 transform rotate-12" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 text-orange-50">
                <Wallet className="w-5 h-5" />
                <span className="font-semibold uppercase tracking-wider text-sm">Total Balance</span>
              </div>
              <div className="text-6xl font-black mb-2 tracking-tight">
                {creditInfo.balance.total.toLocaleString()}
              </div>
              <div className="flex gap-4 text-sm font-medium text-orange-50">
                <span>Sub: {creditInfo.balance.subscription.toLocaleString()}</span>
                <span className="w-px h-4 bg-white/20"></span>
                <span>Purchased: {creditInfo.balance.purchased.toLocaleString()}</span>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
              <Button variant="secondary" className="bg-white/90 text-orange-600 hover:bg-white border-0 shadow-lg" onClick={() => window.location.href = '/pricing'}>
                Top Up Credits
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-1 lg:col-span-1"
        >
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-500 text-sm uppercase tracking-wider font-semibold">
                <CreditCard className="w-4 h-4" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold shadow-lg",
                getPlanColor(creditInfo.plan.type)
              )}>
                {creditInfo.plan.type.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 capitalize mb-1">
                {creditInfo.plan.type}
              </h3>
              {creditInfo.plan.monthlyResetAt && (
                <p className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1 mt-2">
                  Resets {new Date(creditInfo.plan.monthlyResetAt).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-3 lg:col-span-1"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-500 text-sm uppercase tracking-wider font-semibold">
                <RefreshCcw className="w-4 h-4" />
                Monthly Quota
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative pt-2">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {Math.round(quotaPercentage)}%
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                    {creditInfo.plan.monthlyUsed.toLocaleString()} / {creditInfo.plan.monthlyQuota.toLocaleString()}
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${quotaPercentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn(
                      "h-full rounded-full transition-colors",
                      quotaPercentage > 90 ? 'bg-red-500' :
                        quotaPercentage > 75 ? 'bg-orange-500' : 'bg-green-500'
                    )}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Requests remaining: <span className="text-gray-900 font-bold">{creditInfo.plan.monthlyRemaining.toLocaleString()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Usage breakdown & History split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Additional Stats */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <Zap className="w-5 h-5 text-yellow-400" />
                Lifetime Stats
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Total Purchased</div>
                  <div className="text-2xl font-bold text-gray-900">{creditInfo.statistics.totalPurchased.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Total Consumed</div>
                  <div className="text-2xl font-bold text-gray-900">{creditInfo.statistics.totalUsed.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
            <h4 className="font-bold text-blue-900 mb-2">Did you know?</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              Your monthly quota resets automatically. Unused subscription credits do not roll over, but purchased credits never expire.
            </p>
          </div>
        </div>

        {/* Right Col: Transaction History */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 rounded-t-[2rem]">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Transactions
                </CardTitle>
                <div className="text-sm text-gray-500">Last 20 records</div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <RefreshCcw className="w-6 h-6 text-gray-400" />
                  </div>
                  No transactions found recently.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {transactions.map((tx, i) => (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      key={tx.id}
                      className="p-4 hover:bg-gray-50/80 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border",
                          tx.amount > 0
                            ? "bg-green-50 border-green-100 text-green-600"
                            : "bg-red-50 border-red-100 text-red-600"
                        )}>
                          {tx.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                            {tx.description || tx.type}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={cn(
                          "font-bold text-lg",
                          tx.amount > 0 ? "text-green-600" : "text-gray-900"
                        )}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          Bal: {tx.balanceAfter.toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}
