import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { motion } from 'framer-motion';
import { Flag, ShieldBan, ExternalLink, Ban, CheckCircle, XCircle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { adminApi, type LinkReport, type BannedDomain } from '../../lib/adminApi';

const STATUS_TABS = ['pending', 'reviewed', 'actioned', 'dismissed', 'all'] as const;

const REASON_COLORS: Record<string, string> = {
  phishing: 'bg-red-100 text-red-600',
  malware: 'bg-red-100 text-red-600',
  scam: 'bg-orange-100 text-orange-600',
  spam: 'bg-yellow-100 text-yellow-700',
  illegal: 'bg-purple-100 text-purple-600',
  other: 'bg-gray-100 text-gray-600',
};

export default function AdminReports() {
  const [reports, setReports] = useState<LinkReport[]>([]);
  const [domains, setDomains] = useState<BannedDomain[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [newDomainReason, setNewDomainReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, d] = await Promise.all([
        adminApi.getReports(statusFilter),
        adminApi.getBannedDomains(),
      ]);
      setReports(r.data.reports);
      setDomains(d.data.domains);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load().catch((err) => console.error('[Reports] Unhandled error:', err));
  }, [load]);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  // 下架連結 + 標記 actioned
  const handleDisable = (report: LinkReport) =>
    withBusy(report.id, async () => {
      await adminApi.flagLink(report.slug, `Abuse report: ${report.reason}`, true);
      await adminApi.updateReport(report.id, { status: 'actioned', admin_note: 'Link disabled' });
    });

  // 封鎖目標網域（同時下架該連結）
  const handleBanDomain = (report: LinkReport) =>
    withBusy(report.id, async () => {
      if (!report.url) throw new Error('No target URL recorded for this report');
      const host = new URL(report.url).hostname.toLowerCase();
      await adminApi.banDomain(host, `Abuse report: ${report.reason} (/${report.slug})`);
      await adminApi.flagLink(report.slug, `Banned domain: ${host}`, true);
      await adminApi.updateReport(report.id, { status: 'actioned', admin_note: `Domain ${host} banned + link disabled` });
    });

  const handleDismiss = (report: LinkReport) =>
    withBusy(report.id, () => adminApi.updateReport(report.id, { status: 'dismissed' }).then(() => {}));

  const handleReviewed = (report: LinkReport) =>
    withBusy(report.id, () => adminApi.updateReport(report.id, { status: 'reviewed' }).then(() => {}));

  const handleAddDomain = () =>
    withBusy('__add_domain__', async () => {
      if (!newDomain.trim()) throw new Error('Domain is required');
      await adminApi.banDomain(newDomain.trim(), newDomainReason.trim() || undefined);
      setNewDomain('');
      setNewDomainReason('');
    });

  const handleUnban = (domain: string) =>
    withBusy(`__unban_${domain}`, () => adminApi.unbanDomain(domain).then(() => {}));

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          <Flag className="w-8 h-8 text-red-500" />
          Abuse Reports
        </h1>
        <p className="text-gray-500 font-medium mt-1">
          Public reports from /report — review, disable links, or ban domains.
        </p>
      </motion.div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Reports */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Reports</CardTitle>
            <div className="flex gap-2">
              {STATUS_TABS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-colors',
                    statusFilter === s
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">
              No {statusFilter === 'all' ? '' : statusFilter} reports 🎉
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-xl border-2 border-gray-100 hover:border-orange-100 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <a
                          href={`https://oao.to/${report.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-black text-gray-800 hover:text-orange-500 flex items-center gap-1"
                        >
                          /{report.slug} <ExternalLink className="w-3 h-3" />
                        </a>
                        <Badge className={REASON_COLORS[report.reason] || REASON_COLORS.other}>
                          {report.reason}
                        </Badge>
                        <Badge
                          className={
                            report.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : report.status === 'actioned'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-500'
                          }
                        >
                          {report.status}
                        </Badge>
                        {report.link_is_active === 0 && (
                          <Badge className="bg-red-100 text-red-600">link disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-medium truncate" title={report.url || ''}>
                        → {report.url || '(url not recorded)'}
                      </p>
                      {report.details && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">
                          {report.details}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(report.created_at).toLocaleString()}
                        {report.reporter_email && ` · ${report.reporter_email}`}
                        {report.admin_note && ` · note: ${report.admin_note}`}
                      </p>
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === report.id}
                          onClick={() => handleDisable(report)}
                          title="Disable this short link"
                        >
                          <Ban className="w-4 h-4 mr-1" /> Disable link
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === report.id || !report.url}
                          onClick={() => handleBanDomain(report)}
                          title="Ban the target domain and disable this link"
                        >
                          <ShieldBan className="w-4 h-4 mr-1" /> Ban domain
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === report.id}
                          onClick={() => handleReviewed(report)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Reviewed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === report.id}
                          onClick={() => handleDismiss(report)}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banned domains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldBan className="w-5 h-5 text-red-500" /> Banned Domains ({domains.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="evil.example.com"
              className="max-w-xs"
            />
            <Input
              value={newDomainReason}
              onChange={(e) => setNewDomainReason(e.target.value)}
              placeholder="Reason (optional)"
              className="max-w-xs"
            />
            <Button disabled={busyId === '__add_domain__'} onClick={handleAddDomain}>
              <ShieldBan className="w-4 h-4 mr-1" /> Ban domain
            </Button>
          </div>
          {domains.length === 0 ? (
            <p className="text-gray-400 font-medium">No banned domains yet.</p>
          ) : (
            <div className="space-y-2">
              {domains.map((d) => (
                <div
                  key={d.domain}
                  className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div>
                    <span className="font-bold text-gray-800">{d.domain}</span>
                    {d.reason && <span className="text-sm text-gray-500 ml-3">{d.reason}</span>}
                    <span className="text-xs text-gray-400 ml-3">
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === `__unban_${d.domain}`}
                    onClick={() => handleUnban(d.domain)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
