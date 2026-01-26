import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Plan {
    id: string;
    name: string;
    display_name: string;
    price_monthly: number;
    price_yearly: number;
    monthly_credits: number;
    api_calls_per_day: number;
    max_api_keys: number;
    features: string[];
}

interface Props {
    plan: Plan | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updates: any) => Promise<void>;
}

export default function PlanEditModal({ plan, isOpen, onClose, onSave }: Props) {
    const [form, setForm] = useState({
        display_name: '',
        price_monthly: 0,
        price_yearly: 0,
        monthly_credits: 0,
        api_calls_per_day: 0,
        max_api_keys: 0,
        features: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (plan) {
            setForm({
                display_name: plan.display_name,
                price_monthly: plan.price_monthly,
                price_yearly: plan.price_yearly,
                monthly_credits: plan.monthly_credits,
                api_calls_per_day: plan.api_calls_per_day,
                max_api_keys: plan.max_api_keys,
                features: (plan.features || []).join('\n')
            });
        }
    }, [plan]);

    if (!plan) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                display_name: form.display_name,
                price_monthly: Number(form.price_monthly),
                price_yearly: Number(form.price_yearly),
                monthly_credits: Number(form.monthly_credits),
                api_calls_per_day: Number(form.api_calls_per_day),
                max_api_keys: Number(form.max_api_keys),
                features: form.features.split('\n').filter(f => f.trim())
            });
            onClose();
        } catch (err) {
            console.error('Save error:', err);
            alert(`Failed to save: ${err}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${plan.display_name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold mb-2">Display Name</label>
                    <Input value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Monthly Price ($)</label>
                        <Input type="number" step="0.01" value={form.price_monthly} onChange={(e) => setForm({...form, price_monthly: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Yearly Price ($)</label>
                        <Input type="number" step="0.01" value={form.price_yearly} onChange={(e) => setForm({...form, price_yearly: parseFloat(e.target.value)})} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Monthly Credits</label>
                        <Input type="number" value={form.monthly_credits} onChange={(e) => setForm({...form, monthly_credits: parseInt(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">API Calls/Day</label>
                        <Input type="number" value={form.api_calls_per_day} onChange={(e) => setForm({...form, api_calls_per_day: parseInt(e.target.value)})} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Max API Keys</label>
                    <Input type="number" value={form.max_api_keys} onChange={(e) => setForm({...form, max_api_keys: parseInt(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Features (one per line)</label>
                    <textarea
                        className="w-full px-4 py-2 border rounded-xl"
                        rows={5}
                        value={form.features}
                        onChange={(e) => setForm({...form, features: e.target.value})}
                    />
                </div>
                <div className="flex gap-3 pt-4 border-t">
                    <Button variant="ghost" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
