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
      cta: user ? 'Current Plan' : 'Get Started',
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

  // 动态数据映射
  const displayPlans = plans.map(p => {
    const color = planColors[p.name] || planColors.free;
    const Icon = planIcons[p.name] || Zap;
    const features = JSON.parse(p.features || '[]');
    
    return {
      id: p.id,
      name: p.display_name,
      planType: p.name,
      icon: Icon,
      iconColor: color.icon,
      iconBg: color.bg,
      borderColor: color.border,
      hoverBorder: color.hover,
      shadowColor: 'shadow-orange-400/30',
      price: `$${p.price_monthly}`,
      period: p.price_monthly === 0 ? 'forever' : 'per month',
      description: `${p.monthly_credits.toLocaleString()} credits/month`,
      features,
      cta: user ? 'Current Plan' : 'Get Started',
      ctaVariant: 'default' as const,
      popular: p.name === 'pro',
      rotate: 'rotate-0',
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
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-100 text-orange-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <Crown className="w-4 h-4" />
              Simple, Transparent Pricing
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 mb-6">
              Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">Perfect Plan</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
              Start for free, upgrade when you need more. No hidden fees, cancel anytime. 💰
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
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
                      {plan.price !== 'Custom' && (
                        <span className="text-gray-400 font-bold">/ {plan.period}</span>
                      )}
                    </div>
                    {plan.price === 'Custom' && (
                      <p className="text-gray-400 font-bold text-sm mt-1">{plan.period}</p>
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

          {/* Pay-As-You-Go Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border-2 border-purple-100 text-purple-600 rounded-full text-sm font-bold shadow-sm mb-4">
                <DollarSign className="w-4 h-4" />
                Flexible Billing
              </div>
              <h2 className="text-4xl font-black text-gray-800 mb-4">
                Never run out of credits
              </h2>
              <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
                When you use all your monthly quota, we automatically use your purchased credits. 
                No service interruption, complete control.
              </p>
            </div>

            <Card className="max-w-4xl mx-auto p-8 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-gray-800 mb-2">How it works</h3>
                <p className="text-gray-600 font-medium">Simple, transparent, and predictable</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-black text-blue-600">1</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Use your monthly quota</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Every plan includes free monthly quota. Use it for your regular traffic.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-black text-purple-600">2</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Tap into purchased credits</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    When quota runs out, we use your purchased credits automatically. No interruption.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-black text-green-600">3</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Top up anytime</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Buy credits in advance at $10 per 1000 credits. Never expires, always available.
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Example: Growing startup</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Starter plan (1,000 free quota/month) + 500 purchased credits<br/>
                      <span className="text-gray-500">Usage: 1,200 links created this month</span>
                    </p>
                    <div className="mt-3 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">✓ First 1,000</span>
                        <span className="text-gray-600">Free (included in $9.99 plan)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-semibold">✓ Next 200</span>
                        <span className="text-gray-600">From purchased credits (200/500 used)</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-bold">Total cost this month:</span>
                        <span className="text-gray-900 font-black">$9.99</span>
                        <span className="text-gray-500 text-xs">(no overage charges)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

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
            <Card className="p-12 bg-gradient-to-r from-orange-400 to-pink-500 text-white border-white/20 shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-black mb-4">Still have questions?</h2>
              <p className="text-xl text-white/90 mb-8 font-medium">
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
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


