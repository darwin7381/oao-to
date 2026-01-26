import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CreditCard, Users, DollarSign, Zap, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PlanEditModal from '../../components/admin/PlanEditModal';
import { adminApi, type Plan } from '../../lib/adminApi';

export default function PlansManagement() {
    const { token } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    useEffect(() => {
        loadPlans().catch((error) => {
            console.error('[Plans] Unhandled error:', error);
        });
    }, [token]);

    const loadPlans = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getPlans();
            setPlans(data.data.plans);
        } catch (err: any) {
            console.error('Failed to load plans:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getPlanColor = (name: string) => {
        const colors: any = {
            free: 'from-gray-400 to-gray-500',
            starter: 'from-blue-400 to-blue-500',
            pro: 'from-purple-400 to-purple-500',
            enterprise: 'from-slate-700 to-slate-800',
        };
        return colors[name] || 'from-gray-400 to-gray-500';
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Plans & Pricing</h1>
                    <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                    <p className="text-lg text-gray-500 font-medium">Manage subscription plans and Pay-As-You-Go pricing</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className="border-0 shadow-xl hover:shadow-2xl transition-all">
                        <CardContent className="p-6">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanColor(plan.name)} flex items-center justify-center text-white font-black text-xl mb-4`}>
                                {plan.display_name[0]}
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">{plan.display_name}</h3>
                            <div className="text-3xl font-black text-gray-900 mb-1">
                                ${plan.price_monthly}
                                <span className="text-sm font-normal text-gray-500">/mo</span>
                            </div>
                            {plan.price_yearly > 0 && (
                                <div className="text-sm text-gray-600 mb-4">
                                    ${plan.price_yearly}/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                                </div>
                            )}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Zap className="w-4 h-4 text-orange-500" />
                                    <span>{plan.monthly_credits.toLocaleString()} credits/mo</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <CreditCard className="w-4 h-4 text-blue-500" />
                                    <span>{plan.max_api_keys} API keys</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-green-500" />
                                    <span>{plan.subscriber_count} subscribers</span>
                                </div>
                            </div>
                            <Badge className={plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                {plan.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-4"
                                onClick={() => setEditingPlan(plan)}
                            >
                                <SettingsIcon className="w-4 h-4 mr-2" />
                                Edit Plan
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-0 shadow-xl shadow-purple-100/50 rounded-3xl">
                <CardHeader className="bg-white/50 border-b border-purple-50 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-500" />
                        Pay-As-You-Go Pricing
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <div className="text-sm text-purple-600 font-semibold mb-1">Link Creation</div>
                            <div className="text-2xl font-bold text-purple-900">1 credit</div>
                            <div className="text-xs text-purple-600 mt-1">per short link created via API</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="text-sm text-blue-600 font-semibold mb-1">Analytics Query</div>
                            <div className="text-2xl font-bold text-blue-900">0.1 credit</div>
                            <div className="text-xs text-blue-600 mt-1">per analytics API call</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <div className="text-sm text-green-600 font-semibold mb-1">Overage Rate</div>
                            <div className="text-2xl font-bold text-green-900">$0.01</div>
                            <div className="text-xs text-green-600 mt-1">per credit when exceeding quota</div>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> Pay-As-You-Go rates apply when users exceed their monthly quota. 
                            Subscription credits are always used first, then purchased credits.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <PlanEditModal
                plan={editingPlan}
                isOpen={!!editingPlan}
                onClose={() => setEditingPlan(null)}
                onSave={async (updates) => {
                    if (!editingPlan) return;
                    await adminApi.updatePlan(editingPlan.id, updates);
                    setEditingPlan(null);
                    await loadPlans();
                }}
            />
        </div>
    );
}