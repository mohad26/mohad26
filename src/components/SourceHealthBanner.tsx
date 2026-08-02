import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Radio } from 'lucide-react';

export interface SourceHealthData {
  youtube?: { status: { status: 'live' | 'degraded' | 'not_configured'; lastSuccess: string | null; message?: string }; quotaUsed: number };
  reddit?: { sourceId: string; status: 'live' | 'degraded' | 'not_configured'; lastSuccess: string | null; message?: string };
  gdelt?: { sourceId: string; status: 'live' | 'degraded' | 'not_configured'; lastSuccess: string | null };
  petra_rss?: { sourceId: string; status: 'live' | 'degraded' | 'not_configured'; lastSuccess: string | null };
  meta_import?: { sourceId: string; status: 'live'; batchesCount: number };
}

export const SourceHealthBanner: React.FC = () => {
  const [health, setHealth] = useState<SourceHealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sources-status');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.warn('Failed to fetch sources status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 60000); // refresh every minute
    return () => clearInterval(timer);
  }, []);

  if (!health) return null;

  const renderBadge = (name: string, statusObj?: { status: 'live' | 'degraded' | 'not_configured'; lastSuccess?: string | null; message?: string }, extraInfo?: string) => {
    const status = statusObj?.status || 'not_configured';
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    let Icon = XCircle;

    if (status === 'live') {
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      Icon = CheckCircle2;
    } else if (status === 'degraded') {
      colorClass = 'bg-amber-50 text-amber-800 border-amber-300';
      Icon = AlertTriangle;
    }

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-xs ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold">{name}:</span>
        <span className="capitalize">{status.replace('_', ' ')}</span>
        {extraInfo && <span className="opacity-75 font-mono">({extraInfo})</span>}
      </div>
    );
  };

  const ytQuota = health.youtube?.quotaUsed ?? 0;

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium text-slate-300">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide text-white uppercase text-[11px]">Source Provenance Health:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {renderBadge('YouTube', health.youtube?.status, `${ytQuota}/9,000 units`)}
          {renderBadge('Reddit OAuth', health.reddit)}
          {renderBadge('GDELT News', health.gdelt)}
          {renderBadge('Petra RSS', health.petra_rss)}
          {renderBadge('Meta Import', health.meta_import, `${health.meta_import?.batchesCount || 0} batches`)}

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
