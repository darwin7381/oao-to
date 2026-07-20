import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ticket, Plus, Eye, EyeOff, DollarSign, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed_amount' | 'credits_bonus',
    discountValue: 50,
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationMonths: 3,
    appliesToPlans: [] as string[],
    bonusCredits: 0,
    maxUses: null as number | null,
    perUserLimit: 1,
    validFrom: null as number | null,
    validUntil: null as number | null,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const response = await api.getPromoCodes();
      setCoupons(response.promoCodes || []);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCoupon = async (couponId: string, currentlyActive: boolean) => {
    try {
      console.log('Toggling coupon:', couponId, 'to', !currentlyActive);
      
      await api.togglePromoCode(couponId, !currentlyActive);
      
      // 重新載入列表
      await loadCoupons();
      
      alert(`Coupon ${!currentlyActive ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      console.error('Failed to toggle coupon:', error);
      alert(error instanceof Error ? error.message : 'Failed to update coupon');
    }
  };

  const handleCreateCoupon = async () => {
    // 驗證必填欄位
    if (!formData.code || formData.code.trim() === '') {
      alert('Coupon code is required');
      return;
    }
    
    // 根據類型驗證
    if (formData.discountType === 'percentage' || formData.discountType === 'fixed_amount') {
      if (!formData.discountValue || formData.discountValue <= 0) {
        alert('Discount value must be greater than 0');
        return;
      }
    }
    
    if (formData.discountType === 'credits_bonus') {
      if (!formData.bonusCredits || formData.bonusCredits <= 0) {
        alert('Bonus credits must be greater than 0');
        return;
      }
    }
    
    try {
      setCreating(true);
      
      const payload: any = {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        duration: formData.duration,
        durationMonths: formData.duration === 'repeating' ? formData.durationMonths : undefined,
        appliesToPlans: formData.appliesToPlans.length > 0 ? formData.appliesToPlans : undefined,
        bonusCredits: formData.bonusCredits || 0,
        maxUses: formData.maxUses || undefined,
        perUserLimit: formData.perUserLimit || 1,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
      };
      
      await api.createPromoCode(payload);
      
      alert('Coupon created successfully!');
      setShowCreateModal(false);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: 50,
        duration: 'once',
        durationMonths: 3,
        appliesToPlans: [],
        bonusCredits: 0,
        maxUses: null,
        perUserLimit: 1,
        validFrom: null,
        validUntil: null,
      });
      loadCoupons();
    } catch (error) {
      console.error('Failed to create coupon:', error);
      alert(error instanceof Error ? error.message : 'Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Coupon Management</h1>
            <p className="text-gray-600">Manage promo codes and VIP discounts</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </Button>
        </div>

        {/* Coupon Types Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-blue-900 mb-2">Once</h3>
              <p className="text-sm text-blue-700">
                First payment only, then full price
              </p>
              <p className="text-xs text-blue-600 mt-2">
                e.g. LAUNCH50 (50% OFF first month)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-green-900 mb-2">Repeating</h3>
              <p className="text-sm text-green-700">
                Limited months discount, then full price
              </p>
              <p className="text-xs text-green-600 mt-2">
                e.g. 3MONTHS_FREE (3 months free)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-purple-900 mb-2">Forever</h3>
              <p className="text-sm text-purple-700">
                Permanent discount, for VIP users
              </p>
              <p className="text-xs text-purple-600 mt-2">
                e.g. VIP_FREE (free forever)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coupons List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Coupon List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No coupons yet</p>
                <p className="text-sm mt-2">Click "Create Coupon" to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {coupons.map((coupon) => {
                  const isActive = coupon.is_active === 1 || coupon.isActive === true;
                  const type = coupon.discount_type || coupon.discountType;
                  const value = coupon.discount_value || coupon.discountValue;
                  const bonus = coupon.bonus_credits || coupon.bonusCredits || 0;
                  const currentUses = coupon.current_uses || coupon.currentUses || 0;
                  const maxUses = coupon.max_uses || coupon.maxUses;
                  const perUser = coupon.per_user_limit || coupon.perUserLimit || 1;
                  
                  return (
                    <div
                      key={coupon.id}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="font-black text-2xl text-gray-900">{coupon.code}</div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            isActive ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
                          }`}>
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isActive ? "outline" : "default"}
                          onClick={() => handleToggleCoupon(coupon.id, isActive)}
                          className={`${!isActive ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        >
                          {isActive ? (
                            <><EyeOff className="w-4 h-4 mr-1" />Disable</>
                          ) : (
                            <><Eye className="w-4 h-4 mr-1" />Enable</>
                          )}
                        </Button>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs">
                        <div className="bg-white/70 p-2 rounded">
                          <div className="text-gray-500 mb-0.5">Type</div>
                          <div className="font-bold text-gray-900">
                            {type === 'percentage' ? 'Percentage' : type === 'fixed_amount' ? 'Fixed $' : 'Credits Bonus'}
                          </div>
                        </div>
                        <div className="bg-white/70 p-2 rounded">
                          <div className="text-gray-500 mb-0.5">Value</div>
                          <div className="font-bold text-orange-600">
                            {type === 'percentage' ? `${value}%` : type === 'fixed_amount' ? `$${value}` : `+${bonus}`}
                          </div>
                        </div>
                        <div className="bg-white/70 p-2 rounded">
                          <div className="text-gray-500 mb-0.5">Usage</div>
                          <div className="font-bold text-gray-900">{currentUses} / {maxUses || '∞'}</div>
                        </div>
                        <div className="bg-white/70 p-2 rounded">
                          <div className="text-gray-500 mb-0.5">Per User</div>
                          <div className="font-bold text-gray-900">{perUser}x</div>
                        </div>
                        
                        {bonus > 0 && type !== 'credits_bonus' && (
                          <div className="bg-green-50 p-2 rounded">
                            <div className="text-green-700 mb-0.5">Bonus</div>
                            <div className="font-bold text-green-600">+{bonus} credits</div>
                          </div>
                        )}
                        
                        {coupon.applies_to_plans && coupon.applies_to_plans !== 'null' && (
                          <div className="bg-blue-50 p-2 rounded col-span-2">
                            <div className="text-blue-700 mb-0.5">Applies To</div>
                            <div className="font-bold text-blue-900 text-xs">
                              {(() => {
                                try {
                                  const plans = JSON.parse(coupon.applies_to_plans);
                                  return plans.length > 0 ? plans.join(', ') : 'All Plans';
                                } catch { return 'All Plans'; }
                              })()}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-gray-50 p-2 rounded col-span-2">
                          <div className="text-gray-500 mb-0.5">Created</div>
                          <div className="font-semibold text-gray-700 text-xs">
                            {new Date(coupon.created_at || coupon.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4"
            >
              <h2 className="text-2xl font-black mb-6">Create Coupon</h2>
              
              <div className="space-y-5">
                {/* Coupon Code */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">
                    Coupon Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="LAUNCH50"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Uppercase letters, numbers, - and _ only</p>
                </div>

                {/* Discount Type */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.discountType}
                    onChange={(e) => setFormData({...formData, discountType: e.target.value as any, discountValue: 0})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="percentage">Percentage Discount (e.g., 50% OFF)</option>
                    <option value="fixed_amount">Fixed Amount (e.g., $10 OFF)</option>
                    <option value="credits_bonus">Bonus Credits (e.g., +1000 credits)</option>
                  </select>
                </div>

                {/* Discount Value - 根據類型顯示不同欄位 */}
                {formData.discountType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center gap-2">
                      Percentage OFF <Percent className="w-4 h-4 text-orange-500" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="50"
                        value={formData.discountValue || ''}
                        onChange={(e) => setFormData({...formData, discountValue: Math.min(100, parseInt(e.target.value) || 0)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-12 focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-600 font-bold text-lg">
                        %
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">1-100%</p>
                  </div>
                )}

                {formData.discountType === 'fixed_amount' && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center gap-2">
                      Amount OFF <DollarSign className="w-4 h-4 text-green-500" />
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                        $
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="10"
                        value={formData.discountValue || ''}
                        onChange={(e) => setFormData({...formData, discountValue: parseInt(e.target.value) || 0})}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        USD
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Fixed dollar amount (converted to cents)</p>
                  </div>
                )}

                {formData.discountType === 'credits_bonus' && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">
                      Bonus Credits Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        placeholder="1000"
                        value={formData.bonusCredits || ''}
                        onChange={(e) => setFormData({...formData, bonusCredits: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-20 focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                        credits
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Permanent credits added to user account</p>
                  </div>
                )}

                {/* Duration Mode */}
                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">
                    Duration Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, duration: 'once'})}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formData.duration === 'once'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold text-sm mb-1">Once</div>
                      <div className="text-xs text-gray-600">First payment only</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, duration: 'repeating'})}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formData.duration === 'repeating'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="font-bold text-sm mb-1">Repeating</div>
                      <div className="text-xs text-gray-600">Limited months</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, duration: 'forever'})}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formData.duration === 'forever'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-bold text-sm mb-1">Forever</div>
                      <div className="text-xs text-gray-600">Permanent discount</div>
                    </button>
                  </div>
                </div>

                {/* Duration Months - 只在 Repeating 時顯示 */}
                {formData.duration === 'repeating' && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">
                      Duration (Months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="3"
                      value={formData.durationMonths}
                      onChange={(e) => setFormData({...formData, durationMonths: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of months this discount applies</p>
                  </div>
                )}

                {/* Applies To Plans */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Applies To Plans (Optional)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['free', 'starter', 'pro', 'enterprise'].map(plan => (
                      <label key={plan} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.appliesToPlans.includes(plan)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, appliesToPlans: [...formData.appliesToPlans, plan]});
                            } else {
                              setFormData({...formData, appliesToPlans: formData.appliesToPlans.filter(p => p !== plan)});
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{plan}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Leave all unchecked for all plans</p>
                </div>

                {/* Max Uses */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Max Total Uses (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={formData.maxUses || ''}
                    onChange={(e) => setFormData({...formData, maxUses: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total times across all users (empty = unlimited)</p>
                </div>

                {/* Per User Limit */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Per User Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.perUserLimit}
                    onChange={(e) => setFormData({ ...formData, perUserLimit: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max times a single user can redeem this code</p>
                </div>

                {/* Validity Window */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">Valid From (Optional)</label>
                    <input
                      type="date"
                      value={formData.validFrom ? new Date(formData.validFrom).toISOString().slice(0, 10) : ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        validFrom: e.target.value ? new Date(e.target.value).getTime() : null,
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Empty = active immediately</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">Valid Until (Optional)</label>
                    <input
                      type="date"
                      value={formData.validUntil ? new Date(formData.validUntil).toISOString().slice(0, 10) : ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        // 設為當天 23:59:59.999，讓當日仍可使用
                        validUntil: e.target.value ? new Date(e.target.value).getTime() + 86399999 : null,
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Empty = never expires</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8 pt-6 border-t">
                  <Button 
                    onClick={handleCreateCoupon} 
                    disabled={creating || !formData.code}
                    className="flex-1"
                  >
                    {creating ? 'Creating...' : 'Create Coupon'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        code: '',
                        discountType: 'percentage',
                        discountValue: 50,
                        duration: 'once',
                        durationMonths: 3,
                        appliesToPlans: [],
                        bonusCredits: 0,
                        maxUses: null,
                        perUserLimit: 1,
                        validFrom: null,
                        validUntil: null,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
