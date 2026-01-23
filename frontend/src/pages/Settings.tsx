import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Trash2, Shield, Bell, Globe, Save, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export default function Settings() {
  const { user, logout } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteAccount = async () => {
    // TODO: Implement account deletion
    console.log('Deleting account...');
    setShowDeleteModal(false);
    logout();
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background font-nunito">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-pink-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-80 animate-float will-change-transform" style={{ animationDelay: '4s' }} />
      </div>

      <Header />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-100 text-blue-500 rounded-full text-sm font-bold shadow-sm mb-6">
              <User className="w-4 h-4" />
              Account Settings
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 mb-6">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Settings</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
              Manage your account, preferences, and privacy settings. ⚙️
            </p>
          </motion.div>

          {/* Settings Sections */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-6"
          >
            {/* Profile Information */}
            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0 rotate-3">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-800 mb-2">Profile Information</h2>
                  <p className="text-gray-500 font-medium">Your basic account details from Google.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {user?.picture && (
                    <img 
                      src={user.picture} 
                      alt={user.name || 'User'} 
                      className="w-16 h-16 rounded-2xl border-2 border-orange-100 shadow-md"
                    />
                  )}
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{user?.name || 'User'}</p>
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                  <p className="text-sm text-gray-600 font-medium">
                    ℹ️ Profile info is synced from your Google account. To update, please change it in your Google settings.
                  </p>
                </div>
              </div>
            </Card>

            {/* Notifications */}
            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-500 flex-shrink-0 -rotate-3">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-800 mb-2">Notifications</h2>
                  <p className="text-gray-500 font-medium">Choose what updates you want to receive.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border-2 border-purple-50 hover:border-purple-200 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">Email Notifications</p>
                    <p className="text-sm text-gray-500">Get notified about important account updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-5 h-5 rounded accent-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border-2 border-purple-50 hover:border-purple-200 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">Marketing Emails</p>
                    <p className="text-sm text-gray-500">Product updates, tips, and special offers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={marketingEmails}
                    onChange={(e) => setMarketingEmails(e.target.checked)}
                    className="w-5 h-5 rounded accent-purple-500"
                  />
                </label>
              </div>
            </Card>

            {/* Privacy & Security */}
            <Card className="p-8 bg-white/60 backdrop-blur-xl border-white/60 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-500 flex-shrink-0 rotate-2">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-800 mb-2">Privacy & Security</h2>
                  <p className="text-gray-500 font-medium">Manage your data and privacy preferences.</p>
                </div>
              </div>

              <div className="space-y-3">
                <a 
                  href="/privacy"
                  className="block p-4 bg-white/50 rounded-2xl border-2 border-green-50 hover:border-green-200 hover:bg-green-50/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 group-hover:text-green-600 transition-colors">Privacy Policy</p>
                      <p className="text-sm text-gray-500">Learn how we handle your data</p>
                    </div>
                    <Globe className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>

                <button 
                  className="w-full text-left p-4 bg-white/50 rounded-2xl border-2 border-green-50 hover:border-green-200 hover:bg-green-50/50 transition-all group"
                  onClick={() => {/* TODO: Implement data export */}}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 group-hover:text-green-600 transition-colors">Export Your Data</p>
                      <p className="text-sm text-gray-500">Download all your links and analytics</p>
                    </div>
                    <Mail className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className={`h-14 px-8 rounded-2xl text-lg font-bold hover:scale-105 shadow-xl transition-all ${
                  saveSuccess ? 'bg-green-500 hover:bg-green-600' : ''
                }`}
              >
                {isSaving ? (
                  'Saving...'
                ) : saveSuccess ? (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>

            {/* Danger Zone */}
            <Card className="p-8 bg-red-50/60 backdrop-blur-xl border-2 border-red-200 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0 -rotate-3">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-800 mb-2">Danger Zone</h2>
                  <p className="text-gray-600 font-medium">Irreversible and destructive actions.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/80 rounded-2xl border-2 border-red-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 mb-1">Delete Account</p>
                      <p className="text-sm text-gray-600">
                        Permanently delete your account and all your data. This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setShowDeleteModal(true)}
                      className="bg-red-100 text-red-600 hover:bg-red-200 border-2 border-red-200 font-bold px-6 h-12 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account?"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-100">
            <p className="text-red-700 font-bold text-lg mb-2">⚠️ This is permanent!</p>
            <p className="text-gray-700 font-medium text-sm">
              Once you delete your account, all your shortened links, analytics data, and settings will be permanently removed. 
              Your existing short links will stop working.
            </p>
          </div>
          
          <p className="text-gray-600 font-medium">
            Are you absolutely sure you want to delete your account?
          </p>

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
              className="flex-1 h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Yes, Delete Forever
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

