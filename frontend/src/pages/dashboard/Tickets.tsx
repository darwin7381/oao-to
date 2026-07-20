import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Plus, ArrowLeft, Send, LifeBuoy, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { api, type SupportTicketSummary, type SupportTicketDetail, type SupportTicketMessage } from '../../lib/api';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CATEGORIES = [
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'abuse', label: 'Report Abuse' },
  { value: 'other', label: 'Other' },
];

export default function Tickets() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // 詳情視圖
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // 建單 modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ subject: '', message: '', category: 'technical' });

  useEffect(() => {
    loadTickets().catch((error) => {
      console.error('[Tickets] Unhandled error:', error);
    });
  }, [token]);

  const loadTickets = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api.getSupportTickets();
      setTickets(data.tickets);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await api.getSupportTicket(id);
      setSelectedTicket(data.ticket);
      setMessages(data.messages);
    } catch (err: any) {
      console.error('Failed to load ticket:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    setSending(true);
    try {
      await api.replySupportTicket(selectedTicket.id, replyText.trim());
      setReplyText('');
      await openTicket(selectedTicket.id);
      await loadTickets();
    } catch (err: any) {
      console.error('Failed to reply:', err);
      alert(err?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.subject.trim() || !createForm.message.trim()) {
      setCreateError('Subject and message are required');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const ticket = await api.createSupportTicket({
        subject: createForm.subject.trim(),
        message: createForm.message.trim(),
        category: createForm.category,
      });
      setShowCreateModal(false);
      setCreateForm({ subject: '', message: '', category: 'technical' });
      await loadTickets();
      await openTicket(ticket.id);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (ts: number | null) =>
    ts ? new Date(ts).toLocaleString() : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ============ 詳情視圖 ============
  if (selectedTicket) {
    const isClosed = selectedTicket.status === 'closed';

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => { setSelectedTicket(null); setMessages([]); }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </button>

        <Card className="p-6 bg-white/80 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl font-black text-gray-800">{selectedTicket.title}</h1>
            <Badge className={cn('border', STATUS_STYLES[selectedTicket.status])}>
              {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-400 font-medium">
            #{selectedTicket.id} · Created {formatDate(selectedTicket.created_at)}
          </p>
        </Card>

        {detailLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 原始描述 = 第一則訊息 */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-blue-500 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
                <p className="whitespace-pre-wrap font-medium">{selectedTicket.description}</p>
                <p className="text-xs text-blue-100 mt-2">{formatDate(selectedTicket.created_at)}</p>
              </div>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.user_role === 'admin' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-5 py-3 shadow-sm',
                  msg.user_role === 'admin'
                    ? 'bg-white border-2 border-gray-100 text-gray-700 rounded-tl-sm'
                    : 'bg-blue-500 text-white rounded-tr-sm'
                )}>
                  {msg.user_role === 'admin' && (
                    <p className="text-xs font-bold text-purple-500 mb-1">Support Team</p>
                  )}
                  <p className="whitespace-pre-wrap font-medium">{msg.message}</p>
                  <p className={cn('text-xs mt-2', msg.user_role === 'admin' ? 'text-gray-400' : 'text-blue-100')}>
                    {formatDate(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Card className="p-4 bg-white/80 backdrop-blur-xl">
          {isClosed ? (
            <p className="text-center text-gray-400 font-medium py-2">
              This ticket is closed. Need more help? Create a new ticket.
            </p>
          ) : (
            <div className="flex gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                placeholder="Write a reply…"
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-100 focus:border-blue-200 rounded-xl outline-none text-gray-700 font-medium transition-all resize-none"
              />
              <Button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="self-end h-12 px-5 rounded-xl font-bold disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
          {selectedTicket.status === 'resolved' && (
            <p className="text-xs text-gray-400 font-medium mt-2 text-center">
              Replying will reopen this resolved ticket.
            </p>
          )}
        </Card>
      </div>
    );
  }

  // ============ 列表視圖 ============
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800">Support Tickets</h1>
          <p className="text-gray-500 font-medium mt-1">Track your support requests and replies</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl font-bold"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card className="p-12 bg-white/80 backdrop-blur-xl text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mx-auto mb-4">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">No tickets yet</h3>
          <p className="text-gray-500 font-medium mb-6">
            Need help with anything? Open a ticket and we'll get back to you within 24 hours.
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-xl font-bold">
            <Plus className="w-4 h-4 mr-2" />
            Create your first ticket
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card
                className="p-5 bg-white/80 backdrop-blur-xl hover:shadow-lg transition-all cursor-pointer"
                onClick={() => openTicket(ticket.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">{ticket.title}</h3>
                      <p className="text-sm text-gray-400 font-medium">
                        #{ticket.id.slice(0, 18)}… · Updated {formatDate(ticket.updated_at || ticket.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn('border flex-shrink-0', STATUS_STYLES[ticket.status])}>
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </Badge>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* 建單 Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Support Ticket">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
            <select
              value={createForm.category}
              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              className="w-full h-12 px-4 bg-white border-2 border-gray-100 focus:border-blue-200 rounded-xl outline-none text-gray-700 font-medium transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              maxLength={200}
              value={createForm.subject}
              onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
              placeholder="Brief summary of your issue"
              className="w-full h-12 px-4 bg-white border-2 border-gray-100 focus:border-blue-200 rounded-xl outline-none text-gray-700 font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
            <textarea
              rows={5}
              maxLength={5000}
              value={createForm.message}
              onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
              placeholder="Describe your issue in detail…"
              className="w-full px-4 py-3 bg-white border-2 border-gray-100 focus:border-blue-200 rounded-xl outline-none text-gray-700 font-medium transition-all resize-none"
            />
          </div>

          {createError && (
            <div className="p-3 bg-red-50 border-2 border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {createError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-xl font-bold disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Ticket'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
