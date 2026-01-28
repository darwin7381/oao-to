import { motion } from 'framer-motion';
import { Check, Zap, Crown, Rocket, HelpCircle, TrendingUp, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  monthly_credits: number;
  features: string;
  sort_order: number;
}

export default function Pricing() {
  const { user, login } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [creditAmount, setCreditAmount] = useState(1000);

  // 定义图标和颜色映射（必须在使用前定义）
  const planIcons: Record<string, any> = {
    free: Zap,
    starter: TrendingUp,
    pro: Crown,
    enterprise: Rocket,
  };

  const planColors: Record<string, any> = {
    free: { icon: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-100', hover: 'hover:border-blue-300' },
    starter: { icon: 'text-green-500', bg: 'bg-green-100', border: 'border-green-100', hover: 'hover:border-green-300' },
    pro: { icon: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-200', hover: 'hover:border-orange-400' },
    enterprise: { icon: 'text-purple-500', bg: 'bg-purple-100', border: 'border-purple-100', hover: 'hover:border-purple-300' },
  };

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';
        const response = await fetch(`${apiUrl}/public/plans`);
        if (response.ok) {
          const data = await response.json();
          setPlans(data.data.plans || []);
        }
      } catch (error) {
        console.error('Failed to load plans:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  // Fallback 静态数据（定义在使用前）
  const fallbackPlans = [
    {
      name: 'Free',
      icon: Zap,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      borderColor: 'border-blue-100',
      hoverBorder: 'hover:border-blue-300',
      shadowColor: 'shadow-blue-400/20',
      price: '$0',
      period: 'forever',
      description: 'Perfect for personal use and trying out',
      features: [
        '100 links per month',
        'Basic analytics',
        'QR code generation',
        'Custom slugs',
        'Link management dashboard',
        'Community support',
      ],
      cta: 'Get Started',
      ctaVariant: 'secondary' as const,
      popular: false,
      rotate: 'rotate-2',
    },
    {
      name: 'Pro',
      icon: Crown,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-100',
      borderColor: 'border-orange-200',
      hoverBorder: 'hover:border-orange-400',
      shadowColor: 'shadow-orange-400/30',
      price: '$9',
      period: 'per month',
      description: 'For creators and small businesses',
      features: [
        'Unlimited links',
        'Advanced analytics',
        'Custom domains',
        'Link expiration',
        'Bulk link creation',
        'Priority support',
        'Team collaboration (up to 3)',
        'Branded QR codes',
      ],
      cta: 'Upgrade to Pro',
      ctaVariant: 'default' as const,
      popular: true,
      rotate: '-rotate-1',
    },
    {
      name: 'Enterprise',
      icon: Rocket,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-100',
      borderColor: 'border-purple-100',
      hoverBorder: 'hover:border-purple-300',
      shadowColor: 'shadow-purple-400/20',
      price: 'Custom',
      period: 'contact us',
      description: 'For large teams and organizations',
      features: [
        'Everything in Pro',
        'Unlimited team members',
        'API access',
        'SSO & advanced security',
        'Custom integrations',
        'Dedicated account manager',
        '99.99% SLA guarantee',
        'White-label solution',
      ],
      cta: 'Contact Sales',
      ctaVariant: 'secondary' as const,
      popular: false,
      rotate: 'rotate-2',
    },
  ];

  // 分离 Enterprise 和其他方案
  const mainPlans = plans.filter(p => p.name !== 'enterprise');
  const enterprisePlan = plans.find(p => p.name === 'enterprise');

  // 完整的 features 映射
  const featuresMap: Record<string, string[]> = {
    free: [
      `${plans.find(p => p.name === 'free')?.monthly_credits || 400} API calls/month`,
      'Basic analytics',
      'QR code generation',
      'Custom slugs',
      'Link management',
      'Community support',
    ],
    starter: [
      `${plans.find(p => p.name === 'starter')?.monthly_credits || 1000} API calls/month`,
      'Advanced analytics',
      'Email support',
      'Custom domains',
      'Bulk operations',
      '10 API keys',
    ],
    pro: [
      `${plans.find(p => p.name === 'pro')?.monthly_credits || 10000} API calls/month`,
      'Premium analytics',
      'Priority support',
      'Webhooks',
      'Team collaboration',
      '25 API keys',
      'SLA guarantee',
    ],
  };

  // 映射主要方案
  const displayPlans = mainPlans.map(p => {
    const color = planColors[p.name] || planColors.free;
    const Icon = planIcons[p.name] || Zap;
    const features = featuresMap[p.name] || [];
    const price = billingPeriod === 'yearly' ? p.price_yearly : p.price_monthly;
    const savings = billingPeriod === 'yearly' && p.price_yearly > 0 
      ? Math.round((1 - p.price_yearly / (p.price_monthly * 12)) * 100) 
      : 0;
    
    return {
      id: p.id,
      name: p.display_name,
      planType: p.name,
      icon: Icon,
      iconColor: color.icon,
      iconBg: color.bg,
      borderColor: color.border,
      hoverBorder: color.hover,
      price: price === 0 ? 'Free' : `$${price}`,
      period: price === 0 ? 'forever' : billingPeriod === 'yearly' ? 'per year' : 'per month',
      savings,
      features,
      cta: 'Get Started',
      ctaVariant: 'default' as const,
      popular: p.name === 'pro',
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
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
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-4 tracking-tight">
              Simple pricing that <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">scales with you</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium mb-8">
              Start free, upgrade when you need. All plans include API access and analytics.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1.5 bg-gray-100 rounded-full">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2.5 rounded-full font-bold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white shadow-md text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 ${
                  billingPeriod === 'yearly'
                    ? 'bg-white shadow-md text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Save 17%</span>
              </button>
            </div>
          </motion.div>

          {/* Main Pricing Cards (3 plans) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-6xl mx-auto"
          >
            {displayPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.6 }}
                className={plan.popular ? 'md:-mt-4' : ''}
              >
                <Card
                  className={`
                    relative p-8 bg-white/80 backdrop-blur-xl border-2 
                    ${plan.borderColor} ${plan.hoverBorder}
                    ${plan.rotate} hover:rotate-0 hover:scale-105
                    transition-all duration-300 cursor-default group h-full
                    ${plan.popular ? 'shadow-2xl ' + plan.shadowColor : 'shadow-xl'}
                  `}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white text-xs font-black rounded-full shadow-lg">
                      ⭐ MOST POPULAR
                    </div>
                  )}

                  <div className={`w-14 h-14 rounded-2xl ${plan.iconBg} flex items-center justify-center ${plan.iconColor} mb-6 group-hover:scale-110 group-hover:rotate-12 transition-transform`}>
                    <plan.icon className="w-7 h-7" />
                  </div>

                  <h3 className="text-2xl font-black text-gray-800 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm font-medium mb-6 min-h-[40px]">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-gray-800">{plan.price}</span>
                      <span className="text-gray-400 font-bold">/{plan.period}</span>
                    </div>
                    {plan.savings > 0 && (
                      <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        Save {plan.savings}% with yearly
                      </div>
                    )}
                  </div>

                  <Button
                    variant={plan.ctaVariant}
                    className={`w-full h-12 rounded-xl font-bold mb-6 ${
                      plan.popular ? 'shadow-lg ' + plan.shadowColor : ''
                    }`}
                    onClick={() => {
                      if (!user && plan.name === 'Free') {
                        login();
                      }
                    }}
                    type="button"
                  >
                    {plan.cta}
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-gray-700 font-medium text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Enterprise Plan (Separate) */}
          {enterprisePlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="max-w-5xl mx-auto mb-20"
            >
              <Card className="!bg-white border-2 border-gray-200 p-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-10 h-10 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-gray-900 mb-2">{enterprisePlan.display_name}</h3>
                      <p className="text-lg text-gray-700 font-medium">{enterprisePlan.monthly_credits.toLocaleString()} API calls/month</p>
                      <p className="text-gray-600 mt-1">Custom solutions • Dedicated support • SLA guarantee</p>
                    </div>
                  </div>
                  <div className="text-center md:text-right flex-shrink-0">
                    <div className="text-5xl font-black text-gray-900 mb-4">
                      {enterprisePlan.price_monthly >= 1000 ? 'Custom' : `$${enterprisePlan.price_monthly}`}
                    </div>
                    <Button size="lg" className="font-bold px-8">
                      Contact Sales
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Buy Credits with Interactive Slider */}
          <div className="mb-20">
            <div className="max-w-3xl mx-auto">
              <Card className="p-10">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-black text-gray-900 mb-2">Buy Additional Credits</h3>
                  <p className="text-gray-600">No subscription • Credits never expire</p>
                </div>

                {/* Interactive Slider */}
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <div className="text-sm font-bold text-gray-600 mb-1">SELECT AMOUNT</div>
                      <div className="text-4xl font-black text-gray-900">{creditAmount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">credits</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-600 mb-1">TOTAL PRICE</div>
                      <div className="text-4xl font-black text-orange-600">${(creditAmount / 100).toFixed(0)}</div>
                    </div>
                  </div>
                  
                  <input
                    type="range"
                    min="1000"
                    max="50000"
                    step="1000"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer 
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                               [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                               [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-orange-500 
                               [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-400 mt-2 font-mono">
                    <span>1K</span>
                    <span>10K</span>
                    <span>25K</span>
                    <span>50K</span>
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-6 text-center">
                  <div className="text-sm text-gray-600 mb-4">
                    <strong className="text-orange-600">$0.01</strong> per credit • Instant delivery • Never expires
                  </div>
                  <Link to="/dashboard/credits">
                    <Button size="lg" className="w-full max-w-md">
                      Buy {creditAmount.toLocaleString()} Credits for ${(creditAmount / 100).toFixed(0)}
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-gray-800 mb-4">
                Frequently Asked <span className="text-orange-500">Questions</span>
              </h2>
              <p className="text-gray-500 font-medium">Got questions? We've got answers!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white/60 backdrop-blur-xl border-white/60 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0 rotate-3">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-gray-800 text-lg">Can I change plans later?</h3>
                </div>
                <p className="text-gray-600 font-medium text-sm ml-11">
                  Absolutely! Upgrade or downgrade anytime. Changes take effect immediately, and we'll prorate any payments.
                </p>
              </Card>

              <Card className="p-6 bg-white/60 backdrop-blur-xl border-white/60 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0 -rotate-3">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-gray-800 text-lg">What happens to my links if I downgrade?</h3>
                </div>
                <p className="text-gray-600 font-medium text-sm ml-11">
                  Your existing links will continue to work! You just won't be able to create new ones beyond the free tier limit.
                </p>
              </Card>

              <Card className="p-6 bg-white/60 backdrop-blur-xl border-white/60 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0 rotate-2">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-gray-800 text-lg">Do you offer refunds?</h3>
                </div>
                <p className="text-gray-600 font-medium text-sm ml-11">
                  Yes! If you're not satisfied within the first 14 days, we'll give you a full refund, no questions asked.
                </p>
              </Card>

              <Card className="p-6 bg-white/60 backdrop-blur-xl border-white/60 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 flex-shrink-0 -rotate-2">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-gray-800 text-lg">Is there a student discount?</h3>
                </div>
                <p className="text-gray-600 font-medium text-sm ml-11">
                  Yes! Students get 50% off the Pro plan. Contact us with your student email for a discount code.
                </p>
              </Card>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-16 text-center"
          >
            <div className="p-12 bg-gradient-to-r from-orange-400 to-pink-500 text-white border-white/20 shadow-2xl rounded-3xl">
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">Still have questions?</h2>
              <p className="text-xl text-white mb-8 font-medium">
                Our team is here to help you find the perfect plan for your needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/support">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-14 px-8 rounded-2xl text-lg font-bold bg-white text-orange-500 hover:bg-white/90 hover:scale-105 shadow-xl"
                  >
                    Contact Support
                  </Button>
                </Link>
                {!user && (
                  <Button
                    size="lg"
                    onClick={login}
                    className="h-14 px-8 rounded-2xl text-lg font-bold bg-white/20 hover:bg-white/30 border-2 border-white/40 hover:scale-105"
                  >
                    Start Free Trial
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


