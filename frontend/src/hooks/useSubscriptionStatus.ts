import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface SubscriptionStatus {
  current: {
    plan: string;
    planDisplayName: string;
    billingPeriod: 'monthly' | 'yearly';
    price: number;
    priceFormatted: string;
    periodStart: number | null;
    periodEnd: number | null;
    periodEndFormatted: string | null;
    status: string;
    features: {
      monthlyQuota: number;
      analytics: string;
      support: string;
    };
  };
  scheduledChange?: {
    type: 'downgrade' | 'upgrade' | 'cancel' | 'period_change';
    newPlan?: string;
    newPlanDisplayName?: string;
    newBillingPeriod?: 'monthly' | 'yearly';
    newPrice?: number;
    newPriceFormatted?: string;
    effectiveDate: number;
    effectiveDateFormatted: string;
    daysUntilChange: number;
    canRevert: boolean;
    changes?: {
      monthlyQuota?: { from: number; to: number };
      analytics?: { from: string; to: string };
      support?: { from: string; to: string };
    };
  };
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

interface UseSubscriptionStatusReturn {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscriptionStatus(): UseSubscriptionStatusReturn {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.getSubscriptionStatus();
      
      if (result.success) {
        setSubscription(result.subscription);
      } else {
        setError('Failed to fetch subscription status');
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      // 不覆寫 subscription：保留上次成功載入的資料（從未載入過則維持 null）
      // 避免付費用戶在 API 失敗時被誤判為 Free plan
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStatus();
  }, []);
  
  return {
    subscription,
    loading,
    error,
    refetch: fetchStatus,
  };
}
