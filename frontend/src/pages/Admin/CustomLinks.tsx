import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { motion } from 'framer-motion';
import {
    Link as LinkIcon,
    Search,
    Trash2,
    MousePointerClick,
    User,
    Calendar,
    Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { adminApi, type AdminLink } from '../../lib/adminApi';

export default function CustomLinks() {
    const { token } = useAuth();
    const [links, setLinks] = useState<AdminLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadLinks().catch((error) => {
            console.error('[CustomLinks] Error:', error);
        });
    }, [token]);

    const loadLinks = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getLinks(1000);
            // 只顯示自定義 slug 的連結（長度 > 8 或包含特殊字符）
            const customLinks = data.data.links.filter(link => 
                link.slug.length > 8 || /[_-]/.test(link.slug)
            );
            setLinks(customLinks);
        } catch (err: any) {
            console.error('Failed to load custom links:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm('確定要刪除此自定義連結嗎？')) return;

        try {
            await adminApi.deleteLink(slug);
            setLinks(links.filter(l => l.slug !== slug));
        } catch (err: any) {
            console.error('Failed to delete link:', err);
            alert(`刪除失敗：${err.message}`);
        }
    };

    const filteredLinks = links.filter(link => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            link.slug.toLowerCase().includes(query) ||
            link.url.toLowerCase().includes(query) ||
            link.user_email.toLowerCase().includes(query)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Custom Links</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                    管理用戶自定義的短網址（非隨機生成）
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Custom Links</span>
                            <Star className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {links.length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Total Clicks</span>
                            <MousePointerClick className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {links.reduce((sum, l) => sum + l.clicks, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 font-semibold">Avg Length</span>
                            <LinkIcon className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {links.length > 0 ? Math.round(links.reduce((sum, l) => sum + l.slug.length, 0) / links.length) : 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card className="border-0 shadow-xl rounded-3xl">
                <CardContent className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋自定義連結..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 font-medium outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-white/50 border-b border-gray-100">
                    <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-purple-500" />
                        Custom Links ({filteredLinks.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Slug</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Destination</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Clicks</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Created</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLinks.map((link, index) => (
                                    <motion.tr
                                        key={link.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="hover:bg-purple-50/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <code className="font-mono font-bold text-purple-600">
                                                oao.to/{link.slug}
                                            </code>
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
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-bold text-gray-900">
                                                {link.clicks.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm text-gray-600">
                                                {new Date(link.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(link.slug)}
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
                    {filteredLinks.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>沒有找到自定義連結</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
