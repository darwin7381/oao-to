import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface SubscriptionData {
  planType: string;
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  balance: number;
  totalAvailable: number;
  subscriptionStatus?: string;
  nextResetDate?: number;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getCredits();
      
      if (response.success && response.data) {
        const { plan, balance } = response.data;
        
        setSubscription({
          planType: plan.type,
          monthlyQuota: plan.monthlyQuota,
          monthlyUsed: plan.monthlyUsed,
          monthlyRemaining: plan.monthlyRemaining,
          balance: balance.total,
          totalAvailable: plan.monthlyRemaining + balance.total,
          nextResetDate: plan.monthlyResetAt,
        });
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
