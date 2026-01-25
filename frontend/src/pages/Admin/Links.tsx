import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { motion } from 'framer-motion';
import {
    Link as LinkIcon,
    Search,
    Trash2,
    ExternalLink,
    BarChart2,
    AlertTriangle,
    Ban,
    Flag,
    Calendar,
    MousePointerClick,
    User,
    Filter,
    Download,
    Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface AdminLink {
    id: string;
    slug: string;
    url: string;
    user_id: string;
    user_email: string;
    clicks: number;
    created_at: string;
    last_clicked_at?: string;
    is_active: boolean;
    is_flagged: boolean;
    flag_reason?: string;
}

export default function AdminLinks() {
    const { token } = useAuth();
    const [links, setLinks] = useState<AdminLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'flagged' | 'inactive'>('all');
    const [selectedLink, setSelectedLink] = useState<AdminLink | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagReason, setFlagReason] = useState('');

    const apiUrl = import.meta.env.PROD ? 'https://api.oao.to' : 'http://localhost:8788';

    useEffect(() => {
        loadLinks();
    }, [token, apiUrl]);

    const loadLinks = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/admin/links?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setLinks(data.data.links);
            } else {
                console.warn('API not ready, using mock data');
            }
        } catch (error) {
            console.warn('Failed to load links, using mock data:', error);
        } finally {
            setLoading(false);
        }
    };

    const displayLinks = links;

    const handleDeleteLink = async (linkId: string) => {
        if (!confirm('確定要永久刪除這個連結嗎？此操作無法復原。')) return;

        try {
            const res = await fetch(`${apiUrl}/api/admin/links/${linkId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setLinks(links.filter(l => l.id !== linkId));
                setShowDetailsModal(false);
            } else {
                alert('刪除失敗');
            }
        } catch (error) {
            console.error('Failed to delete link:', error);
            alert('刪除失敗');
        }
    };

    const handleFlagLink = async () => {
        if (!selectedLink) return;

        try {
            const res = await fetch(`${apiUrl}/api/admin/links/${selectedLink.id}/flag`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: flagReason,
                    disable: true
                })
            });

            if (res.ok) {
                loadLinks();
                setShowFlagModal(false);
                setFlagReason('');
            } else {
                alert('標記失敗');
            }
        } catch (error) {
            console.error('Failed to flag link:', error);
            alert('標記失敗');
        }
    };

    const filteredLinks = displayLinks.filter(link => {
        if (filterStatus !== 'all') {
            if (filterStatus === 'active' && !link.is_active) return false;
            if (filterStatus === 'inactive' && link.is_active) return false;
            if (filterStatus === 'flagged' && !link.is_flagged) return false;
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                link.slug.toLowerCase().includes(query) ||
                link.url.toLowerCase().includes(query) ||
                link.user_email.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const totalClicks = displayLinks.reduce((sum, link) => sum + link.clicks, 0);
    const flaggedCount = displayLinks.filter(l => l.is_flagged).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Links Management</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                    Monitor all short links, manage spam, and track platform usage
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Total Links</span>
                            <LinkIcon className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {displayLinks.length.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Total Clicks</span>
                            <MousePointerClick className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {totalClicks.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Active Links</span>
                            <BarChart2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {displayLinks.filter(l => l.is_active).length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Flagged</span>
                            <Flag className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-3xl font-black text-red-600">
                            {flaggedCount}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by slug, URL, or user email..."
                                className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'active', 'flagged', 'inactive'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={cn(
                                        'px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                                        filterStatus === status
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" className="border-gray-200">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Links Table */}
            <Card className="border-0 shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white/50 border-b border-blue-50 pb-4">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-blue-500" />
                            All Links ({filteredLinks.length})
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredLinks.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No links found matching your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Link
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Destination
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Clicks
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredLinks.map((link, index) => (
                                        <motion.tr
                                            key={link.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.03 }}
                                            className={cn(
                                                "hover:bg-blue-50/30 transition-colors",
                                                link.is_flagged && "bg-red-50/30"
                                            )}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono font-bold text-blue-600">
                                                        oao.to/{link.slug}
                                                    </code>
                                                    {link.is_flagged && (
                                                        <Flag className="w-4 h-4 text-red-500" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-gray-600 hover:text-blue-600 hover:underline max-w-xs truncate block"
                                                >
                                                    {link.url}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    <div className="font-semibold text-gray-900">{link.user_email}</div>
                                                    <div className="text-xs text-gray-500">{link.user_id}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="font-bold text-gray-900">
                                                    {link.clicks.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {link.is_active ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                                        Disabled
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600">
                                                    {new Date(link.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedLink(link);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {!link.is_flagged && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedLink(link);
                                                                setShowFlagModal(true);
                                                            }}
                                                            className="text-yellow-600 hover:bg-yellow-50"
                                                        >
                                                            <Flag className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteLink(link.id)}
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Link Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Link Details"
            >
                {selectedLink && (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <LinkIcon className="w-5 h-5 text-blue-600" />
                                <code className="font-mono font-bold text-blue-600">
                                    oao.to/{selectedLink.slug}
                                </code>
                            </div>
                            <a
                                href={selectedLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-600 hover:text-blue-600 hover:underline break-all"
                            >
                                {selectedLink.url}
                            </a>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1 font-semibold">Total Clicks</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {selectedLink.clicks.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1 font-semibold">Created</div>
                                <div className="text-sm font-bold text-gray-900">
                                    {new Date(selectedLink.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <div className="text-xs text-gray-500 mb-2 font-semibold">Owner</div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-gray-900">{selectedLink.user_email}</span>
                            </div>
                        </div>

                        {selectedLink.is_flagged && (
                            <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <span className="font-bold text-red-900">Flagged Content</span>
                                </div>
                                <p className="text-sm text-red-700">
                                    {selectedLink.flag_reason || 'No reason provided'}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <Button
                                variant="outline"
                                onClick={() => setShowDetailsModal(false)}
                                className="flex-1"
                            >
                                Close
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleDeleteLink(selectedLink.id)}
                                className="flex-1"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Link
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Flag Link Modal */}
            <Modal
                isOpen={showFlagModal}
                onClose={() => {
                    setShowFlagModal(false);
                    setFlagReason('');
                }}
                title="Flag Link as Inappropriate"
            >
                {selectedLink && (
                    <div className="space-y-6">
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <span className="font-bold text-yellow-900">This will disable the link</span>
                            </div>
                            <code className="text-sm text-yellow-700 font-mono">
                                oao.to/{selectedLink.slug}
                            </code>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Reason for flagging
                            </label>
                            <textarea
                                value={flagReason}
                                onChange={(e) => setFlagReason(e.target.value)}
                                placeholder="e.g., Spam, Phishing, Malicious content..."
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none"
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowFlagModal(false);
                                    setFlagReason('');
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleFlagLink}
                                disabled={!flagReason.trim()}
                                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                            >
                                <Flag className="w-4 h-4 mr-2" />
                                Flag & Disable
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
