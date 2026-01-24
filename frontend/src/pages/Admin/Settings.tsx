import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
    Settings as SettingsIcon,
    Shield,
    Mail,
    Key,
    Save
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminSettings() {
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">System Configuration</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                    Manage global platform settings, security policies, and integrations
                </p>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* General Settings */}
                <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <SettingsIcon className="w-5 h-5" />
                            </div>
                            General Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">
                                Platform Name
                            </label>
                            <Input defaultValue="OAO.TO" className="border-gray-200 focus:border-blue-400 focus:ring-blue-100" />
                            <p className="text-xs text-gray-500 ml-1">Displayed in emails and page titles</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">
                                Support Email
                            </label>
                            <Input defaultValue="support@oao.to" className="border-gray-200 focus:border-blue-400 focus:ring-blue-100" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">
                                Default Plan for New Users
                            </label>
                            <div className="relative">
                                <select className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white text-gray-700 font-medium transition-all appearance-none">
                                    <option>Free Tier</option>
                                    <option>Starter</option>
                                    <option>Pro</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="border-0 shadow-xl shadow-red-100/50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="bg-white/50 border-b border-red-50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                                <Shield className="w-5 h-5" />
                            </div>
                            Security Policies
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <div className="font-bold text-gray-900">Admin 2FA Requirement</div>
                                <div className="text-xs text-gray-500 font-medium">Force two-factor auth for all admin accounts</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <div className="font-bold text-gray-900">Session Timeout (Minutes)</div>
                                <div className="text-xs text-gray-500 font-medium">Auto-logout inactive admin sessions</div>
                            </div>
                            <Input className="w-24 text-center border-gray-200 focus:border-red-400 focus:ring-red-100" defaultValue="30" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <div className="font-bold text-gray-900">IP Whitelist Enforcement</div>
                                <div className="text-xs text-gray-500 font-medium">Restrict admin panel access to specific IPs</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Settings */}
                <Card className="border-0 shadow-xl shadow-purple-100/50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="bg-white/50 border-b border-purple-50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                                <Mail className="w-5 h-5" />
                            </div>
                            Email Gateway
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 ml-1">
                                    SMTP Host
                                </label>
                                <Input placeholder="smtp.example.com" className="border-gray-200 focus:border-purple-400 focus:ring-purple-100" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 ml-1">
                                    Port
                                </label>
                                <Input defaultValue="587" className="border-gray-200 focus:border-purple-400 focus:ring-purple-100" />
                            </div>
                        </div>
                        <Button variant="outline" colorScheme="blue" className="w-full border-dashed border-2 hover:border-purple-300 hover:bg-purple-50 text-purple-600">
                            Test Email Configuration
                        </Button>
                    </CardContent>
                </Card>

                {/* API Settings */}
                <Card className="border-0 shadow-xl shadow-green-100/50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="bg-white/50 border-b border-green-50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                <Key className="w-5 h-5" />
                            </div>
                            API Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">
                                Global Rate Limit (req/min)
                            </label>
                            <Input defaultValue="60" className="border-gray-200 focus:border-green-400 focus:ring-green-100" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">
                                Max Payload Size (MB)
                            </label>
                            <Input defaultValue="10" className="border-gray-200 focus:border-green-400 focus:ring-green-100" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <div className="font-bold text-gray-900">Strict API Versioning</div>
                                <div className="text-xs text-gray-500 font-medium">Reject requests without version header</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <Button variant="ghost" colorScheme="blue" className="text-gray-500 hover:text-gray-700">
                    Reset Changes
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    colorScheme="blue"
                    className={cn(
                        "px-8 min-w-[160px]",
                        saveSuccess ? "bg-green-500 hover:bg-green-600 shadow-green-200" : ""
                    )}
                >
                    {saving ? <span className="animate-pulse">Saving...</span> : saveSuccess ? "Saved Successfully!" : (
                        <span className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Configuration
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}
