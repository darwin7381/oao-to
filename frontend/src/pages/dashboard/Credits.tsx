import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Activity,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';

interface CreditInfo {
  balance: {
    total: number;
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
  metadata?: string;
  createdAt: number;
}

export default function Credits() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // 訂閱狀態（新增）
  const { subscription, error: subError, refetch: refetchSubscription } = useSubscriptionStatus();

  const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

  const fetchData = async () => {
    console.log('[Credits] Fetching data...');
    setLoadError(false);
    try {
      // cookie-only 認證：帶 credentials，不再用 Bearer（token 已非真 JWT）
      const [creditsRes, txRes] = await Promise.all([
        fetch(`${apiUrl}/api/account/credits`, { credentials: 'include' }),
        fetch(`${apiUrl}/api/account/transactions?limit=20`, { credentials: 'include' })
      ]);

      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCreditInfo(data.data);
      } else {
        // credits 是核心資料，載入失敗視為錯誤狀態
        throw new Error(`Credits request failed (${creditsRes.status})`);
      }

      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.data.transactions);
      }
    } catch (error) {
      console.error('Failed to load credits data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    fetchData().catch((error) => {
      console.error('[Credits] Retry failed:', error);
    });
  };

  useEffect(() => {
    fetchData().catch((error) => {
      console.error('[Credits] Unhandled error in fetchData:', error);
    });
  }, [apiUrl, token]);

  // 偵測從 Portal 返回或購買成功，強制刷新所有資料
  useEffect(() => {
    const isPortalReturn = searchParams.has('portal_return');
    const isPurchaseSuccess = searchParams.has('purchase') && searchParams.get('purchase') === 'success';
    
    if (isPortalReturn || isPurchaseSuccess) {
      console.log(`[Credits] ${isPortalReturn ? 'Portal return' : 'Purchase success'} detected, refreshing...`);
      // 清除 URL 參數
      searchParams.delete('portal_return');
      searchParams.delete('purchase');
      searchParams.delete('credits');
      setSearchParams(searchParams, { replace: true });
      // 延遲 refresh（給 Stripe webhook 一點時間處理）
      const timer = setTimeout(() => {
        refetchSubscription();
        setLoading(true);
        fetchData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);


  // 打開 Stripe Customer Portal（管理訂閱 / 更新付款方式）
  const openCustomerPortal = async () => {
    try {
      const response = await api.createPortalSession();
      if (response.success && response.portalUrl) {
        window.location.href = response.portalUrl;
      }
    } catch (err) {
      console.error('Portal error:', err);
    }
  };

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

  if (loadError || !creditInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Failed to load credit info</h3>
        <p className="text-gray-500 mt-2 mb-6">
          Something went wrong while loading your credits. Please try again.
        </p>
        <Button onClick={handleRetry} className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  const quotaPercentage = Math.min(100, (creditInfo.plan.monthlyUsed / creditInfo.plan.monthlyQuota) * 100);
  
  // 計算實際可用總額 = Pool A 剩餘 + Pool B 總額
  // Pool A: monthly_remaining（每月免費額度）
  // Pool B: balance.total（永久 credits）
  const actualAvailableCredits = creditInfo.plan.monthlyRemaining + creditInfo.balance.total;

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

      {/* 訂閱狀態載入失敗提示 */}
      {!subscription && subError && (
        <div className="mb-8 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Unable to load your subscription status. Please refresh the page.
        </div>
      )}

      {/* 付款失敗 / 需要驗證警示 */}
      {subscription?.current && (subscription.current.status === 'past_due' || subscription.current.status === 'incomplete') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-8 rounded-xl border-2 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
            subscription.current.status === 'past_due'
              ? "border-red-200 bg-red-50"
              : "border-amber-300 bg-amber-50"
          )}
        >
          <div className="flex items-start gap-3">
            {subscription.current.status === 'past_due' ? (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className={cn(
                "font-bold",
                subscription.current.status === 'past_due' ? "text-red-800" : "text-amber-800"
              )}>
                {subscription.current.status === 'past_due' ? 'Payment Failed' : 'Payment Action Required'}
              </h3>
              <p className={cn(
                "text-sm mt-1",
                subscription.current.status === 'past_due' ? "text-red-700" : "text-amber-700"
              )}>
                {subscription.current.status === 'past_due'
                  ? 'Your last payment failed. Please update your payment method to avoid service interruption.'
                  : 'Your payment requires additional verification. Please complete it to avoid service interruption.'}
              </p>
            </div>
          </div>
          <Button
            onClick={openCustomerPortal}
            className={cn(
              "flex-shrink-0",
              subscription.current.status === 'past_due'
                ? "bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg shadow-red-200"
                : "bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-200"
            )}
          >
            Update Payment Method
          </Button>
        </motion.div>
      )}

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
                <span className="font-semibold uppercase tracking-wider text-sm">Available Credits</span>
              </div>
              <div className="text-6xl font-black mb-2 tracking-tight">
                {actualAvailableCredits.toLocaleString()}
              </div>
              <div className="flex flex-col gap-2 text-sm font-medium text-orange-50">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="opacity-75">Monthly Free</div>
                    <div className="font-bold">{creditInfo.plan.monthlyRemaining.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="opacity-75">Permanent Balance</div>
                    <div className="font-bold">{creditInfo.balance.total.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs text-orange-100 opacity-75 pt-1 border-t border-white/20">
                  Used {creditInfo.plan.monthlyUsed.toLocaleString()}/{creditInfo.plan.monthlyQuota.toLocaleString()} this month · 
                  Resets {creditInfo.plan.monthlyResetAt ? new Date(creditInfo.plan.monthlyResetAt).toLocaleDateString() : 'monthly'}
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
              <div className="text-xs text-orange-100 opacity-75 mb-3">
                Purchased: {creditInfo.balance.purchased.toLocaleString()} · 
                Bonus: {(creditInfo.balance.total - creditInfo.balance.purchased).toLocaleString()}
              </div>
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
              
              {/* 計費資訊 */}
              {subscription?.current && subscription.current.plan !== 'free' && (
                <p className="text-xs text-gray-500 mb-1">
                  {subscription.current.priceFormatted}/{subscription.current.billingPeriod === 'yearly' ? 'year' : 'month'}
                </p>
              )}
              
              {/* Scheduled Change 提示 */}
              {subscription?.scheduledChange && (
                <div className="mt-3 mb-2 w-full">
                  <div className={cn(
                    "text-xs font-medium px-3 py-2 rounded-lg border flex flex-col items-center gap-1",
                    subscription.scheduledChange.type === 'cancel' 
                      ? "text-red-700 bg-red-50 border-red-200"
                      : "text-orange-700 bg-orange-50 border-orange-200"
                  )}>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span className="font-bold">
                        {subscription.scheduledChange.type === 'cancel' ? 'Ending' : 'Scheduled Change'}
                      </span>
                    </div>
                    <span>
                      {subscription.scheduledChange.type === 'cancel' 
                        ? `Cancels ${subscription.scheduledChange.effectiveDateFormatted.split(',')[0]}`
                        : `→ ${subscription.scheduledChange.newPlanDisplayName} on ${subscription.scheduledChange.effectiveDateFormatted.split(',')[0]}`
                      }
                    </span>
                    {subscription.scheduledChange.daysUntilChange > 0 && (
                      <span className="text-[10px] opacity-75">
                        {subscription.scheduledChange.daysUntilChange} days left
                      </span>
                    )}
                  </div>
                  {subscription.scheduledChange.canRevert && (
                    <button
                      onClick={async () => {
                        if (confirm(subscription?.scheduledChange?.type === 'cancel' 
                          ? 'Reactivate your subscription?' 
                          : 'Cancel this scheduled change?'
                        )) {
                          try {
                            await api.cancelScheduledChange();
                            refetchSubscription();
                            fetchData();
                          } catch (err) {
                            alert('Failed to cancel change');
                          }
                        }
                      }}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {subscription.scheduledChange.type === 'cancel' 
                        ? 'Reactivate' 
                        : 'Cancel change'}
                    </button>
                  )}
                </div>
              )}
              
              {creditInfo.plan.monthlyResetAt && !subscription?.scheduledChange && (
                <p className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1 mt-2">
                  Resets {new Date(creditInfo.plan.monthlyResetAt).toLocaleDateString()}
                </p>
              )}
              
              {/* Manage Subscription 按鈕 */}
              {subscription?.current && subscription.current.plan !== 'free' && (
                <button
                  onClick={openCustomerPortal}
                  className="mt-3 text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors"
                >
                  Manage Subscription →
                </button>
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
                  <div className="text-sm text-gray-500 mb-1">Total Credits Received</div>
                  <div className="text-2xl font-bold text-gray-900">{(creditInfo.balance.total || 0).toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Total Consumed</div>
                  <div className="text-2xl font-bold text-gray-900">{creditInfo.statistics.totalUsed.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Change Detail Panel */}
          {subscription?.scheduledChange && (
            <Card className={cn(
              "border-2",
              subscription.scheduledChange.type === 'cancel'
                ? "border-red-200 bg-red-50/50"
                : "border-orange-200 bg-orange-50/50"
            )}>
              <CardContent className="p-5">
                <h3 className={cn(
                  "text-sm font-bold mb-3 flex items-center gap-2",
                  subscription.scheduledChange.type === 'cancel' ? "text-red-800" : "text-orange-800"
                )}>
                  <AlertCircle className="w-4 h-4" />
                  {subscription.scheduledChange.type === 'cancel' 
                    ? 'Subscription Ending'
                    : 'Upcoming Plan Change'}
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Effective Date</span>
                    <span className="font-bold text-gray-900">
                      {subscription.scheduledChange.effectiveDateFormatted.split(',')[0]}
                    </span>
                  </div>
                  
                  {subscription.scheduledChange.newPlanDisplayName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">New Plan</span>
                      <span className="font-bold text-gray-900">
                        {subscription.scheduledChange.newPlanDisplayName}
                      </span>
                    </div>
                  )}
                  
                  {subscription.scheduledChange.newPriceFormatted && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">New Price</span>
                      <span className="font-bold text-gray-900">
                        {subscription.scheduledChange.newPriceFormatted}
                      </span>
                    </div>
                  )}
                  
                  {/* 功能變更明細 */}
                  {subscription.scheduledChange.changes && (
                    <div className="pt-2 mt-2 border-t border-gray-200 space-y-1.5">
                      <div className="text-gray-500 font-semibold">After change:</div>
                      {subscription.scheduledChange.changes.monthlyQuota && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quota</span>
                          <span className="text-gray-900">
                            {subscription.scheduledChange.changes.monthlyQuota.from.toLocaleString()} → {subscription.scheduledChange.changes.monthlyQuota.to.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <p className={cn(
                  "text-[10px] mt-3 leading-relaxed",
                  subscription.scheduledChange.type === 'cancel' ? "text-red-600" : "text-orange-600"
                )}>
                  {subscription.scheduledChange.type === 'cancel'
                    ? "You can continue using your current plan features until the end date."
                    : "You'll keep your current plan features until the change takes effect."
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {!subscription?.scheduledChange && (
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
              <h4 className="font-bold text-blue-900 mb-2">Did you know?</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Your monthly quota resets automatically. Unused subscription credits do not roll over, but purchased credits never expire.
              </p>
            </div>
          )}
        </div>

        {/* Right Col: Transaction History */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 rounded-t-[2rem]">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Account Activity
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
                        {tx.type === 'subscription' ? (
                          <div>
                            <div className="text-sm font-semibold text-orange-600 mb-1">
                              {(() => {
                                try {
                                  const meta = typeof tx.metadata === 'string' && tx.metadata !== 'null' 
                                    ? JSON.parse(tx.metadata) 
                                    : null;
                                  if (meta?.quota_to) {
                                    return `Quota → ${meta.quota_to.toLocaleString()}/mo`;
                                  }
                                  // 從 description 解析
                                  const match = tx.description?.match(/(\d+,?\d*)/);
                                  return match ? `Quota → ${match[1]}/mo` : 'Quota Upgrade';
                                } catch (e) {
                                  console.error('Parse metadata error:', e, tx.metadata);
                                  return 'Quota Upgrade';
                                }
                              })()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                try {
                                  const meta = typeof tx.metadata === 'string' && tx.metadata !== 'null'
                                    ? JSON.parse(tx.metadata)
                                    : null;
                                  if (meta?.immediate_increase) {
                                    return `+${meta.immediate_increase.toLocaleString()} credits now`;
                                  }
                                  return '';
                                } catch {
                                  return '';
                                }
                              })()}
                            </div>
                          </div>
                        ) : tx.type === 'quota_reset' ? (
                          <div>
                            <div className="text-sm font-semibold text-blue-600 mb-1">
                              {(() => {
                                try {
                                  const meta = typeof tx.metadata === 'string' && tx.metadata !== 'null' && tx.metadata !== ''
                                    ? JSON.parse(tx.metadata)
                                    : null;
                                  if (meta?.restored) {
                                    return `Restored ${meta.restored.toLocaleString()} credits`;
                                  }
                                  return 'Quota Reset';
                                } catch {
                                  return 'Quota Reset';
                                }
                              })()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                try {
                                  const meta = typeof tx.metadata === 'string' && tx.metadata !== 'null' && tx.metadata !== ''
                                    ? JSON.parse(tx.metadata)
                                    : null;
                                  if (meta?.quota) {
                                    return `Quota: ${meta.quota.toLocaleString()}/mo`;
                                  }
                                  return '';
                                } catch {
                                  return '';
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={cn(
                              "font-bold text-lg",
                              tx.amount > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} credits
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              Bal: {tx.balanceAfter.toLocaleString()}
                            </div>
                          </>
                        )}
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
