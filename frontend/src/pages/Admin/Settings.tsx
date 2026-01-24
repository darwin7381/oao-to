import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
    Settings as SettingsIcon,
    Shield,
    Mail,
    Globe,
    Bell,
    Key,
    Database
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
                <h1 className="text-4xl font-black text-gray-900 mb-3">System Settings</h1>
                <p className="text-lg text-gray-600 font-medium">
                    Configure platform-wide settings and preferences
                </p>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-blue-500" />
                            General Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Platform Name
                            </label>
                            <Input defaultValue="OAO.TO" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Support Email
                            </label>
                            <Input defaultValue="support@oao.to" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Default Plan
                            </label>
                            <select className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option>Free</option>
                                <option>Starter</option>
                                <option>Pro</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-red-500" />
                            Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <div className="font-semibold text-gray-900">Two-Factor Auth</div>
                                <div className="text-xs text-gray-500">Require 2FA for admin</div>
                            </div>
                            <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <div className="font-semibold text-gray-900">Session Timeout</div>
                                <div className="text-xs text-gray-500">Auto logout after inactivity</div>
                            </div>
                            <Input className="w-24" defaultValue="30" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <div className="font-semibold text-gray-900">IP Whitelist</div>
                                <div className="text-xs text-gray-500">Restrict admin access by IP</div>
                            </div>
                            <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Email Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-purple-500" />
                            Email Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                SMTP Host
                            </label>
                            <Input placeholder="smtp.example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                SMTP Port
                            </label>
                            <Input defaultValue="587" />
                        </div>
                        <Button variant="outline" className="w-full">
                            Test Email Configuration
                        </Button>
                    </CardContent>
                </Card>

                {/* API Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-green-500" />
                            API Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Default Rate Limit (req/min)
                            </label>
                            <Input defaultValue="60" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Max Request Size (MB)
                            </label>
                            <Input defaultValue="10" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <div className="font-semibold text-gray-900">API Versioning</div>
                                <div className="text-xs text-gray-500">Enable API version headers</div>
                            </div>
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-blue-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <Button variant="ghost">
                    Reset to Defaults
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                        "px-8",
                        saveSuccess ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                    )}
                >
                    {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
