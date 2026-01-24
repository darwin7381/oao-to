import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Mail, AlertTriangle, Globe, Smartphone, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';

export default function Settings() {
  const { user, logout } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    logout();
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8">

      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">Settings</h1>
        <p className="text-lg text-gray-500 font-medium max-w-2xl">
          Manage your profile, preferences, and account security.
        </p>
      </div>

      {/* Main Grid Layout - Fills the screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">

        {/* Col 1: Profile (Takes up 2 columns space on large screens for emphasis) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 xl:col-span-2 h-full"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                  <User className="w-5 h-5" />
                </div>
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <img
                    src={user?.avatar}
                    alt={user?.name || 'User'}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-xl group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
                </div>

                <div className="text-center md:text-left flex-1 space-y-2">
                  <h3 className="text-2xl font-black text-gray-900">{user?.name}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 font-medium">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                      <Shield className="w-3 h-3" />
                      Google Authenticated
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-500 flex items-start gap-3">
                <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                <p>
                  Your basic profile information (Name, Email, Avatar) is managed by your Google Account.
                  Any changes made there will automatically reflect here next time you login.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Col 2: Quick Actions / Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-full"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl text-green-500">
                  <Shield className="w-5 h-5" />
                </div>
                Data & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-700 group-hover:text-green-700">Privacy Policy</span>
                  <Globe className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                </div>
                <p className="text-xs text-gray-400">Read how we treat your data.</p>
              </div>

              <div className="p-4 rounded-2xl border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-700 group-hover:text-green-700">Export Data</span>
                  <Mail className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                </div>
                <p className="text-xs text-gray-400">Download a copy of your links.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Col 3: Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="h-full"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-500">
                  <Bell className="w-5 h-5" />
                </div>
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Security Alerts</label>
                  <input type="checkbox" checked={securityAlerts} onChange={e => setSecurityAlerts(e.target.checked)} className="accent-purple-500 w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Product Updates</label>
                  <input type="checkbox" checked={marketingEmails} onChange={e => setMarketingEmails(e.target.checked)} className="accent-purple-500 w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Weekly Reports</label>
                  <input type="checkbox" checked={emailNotifs} onChange={e => setEmailNotifs(e.target.checked)} className="accent-purple-500 w-5 h-5" />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "w-full rounded-2xl font-bold h-12 shadow-lg",
                  saveSuccess ? "bg-green-500 hover:bg-green-600" : "bg-gray-900 hover:bg-black"
                )}
              >
                {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Col 4: Session / Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
                  <Smartphone className="w-5 h-5" />
                </div>
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-800">Current Session</div>
                  <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Active Now
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Col 5: Danger Zone (Spans rest or standard) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-2 xl:col-span-1"
        >
          <Card className="border-red-100 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-red-900">
                <div className="p-2 bg-red-100 rounded-xl text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700/80 mb-6 font-medium">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                className="w-full bg-white border-2 border-red-100 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-bold"
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account?"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-100 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-red-900 font-bold">This is permanent</p>
              <p className="text-red-700 text-sm">
                All your data will be wiped immediately. You cannot recover this account.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 h-12 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              className="flex-1 h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white"
            >
              Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
