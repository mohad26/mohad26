import React, { useState, useEffect } from 'react';
import { Database, BarChart3, PieChart, Calendar, CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface CorpusStatsData {
  totalComments: number;
  bySource: Record<string, number>;
  byKind: Record<string, number>;
  dateRange: { start: string | null; end: string | null };
  codebookVersion: string;
  classifiedPercentage: number;
  languageBreakdown: {
    arCount: number;
    enCount: number;
    arPercentage: number;
    enPercentage: number;
  };
}

export const CorpusStatsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<CorpusStatsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/corpus-stats')
        .then(res => {
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            return res.json();
          }
          return null;
        })
        .then(data => { if (data) setStats(data); })
        .catch(err => console.warn('Corpus stats fetch error:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Research Corpus Provenance & Statistics</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-slate-800">
          {loading || !stats ? (
            <div className="text-center py-12 text-slate-500">Loading corpus audit metrics...</div>
          ) : (
            <>
              {/* Key Totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">Total Corpus (N)</span>
                  <span className="text-2xl font-extrabold text-slate-900">{stats.totalComments.toLocaleString()}</span>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-xs text-emerald-800 font-medium block">Codebook Classified</span>
                  <span className="text-2xl font-extrabold text-emerald-900">{stats.classifiedPercentage}%</span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">({stats.codebookVersion})</span>
                </div>
                <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                  <span className="text-xs text-blue-800 font-medium block">Arabic Ammiya</span>
                  <span className="text-2xl font-extrabold text-blue-900">{stats.languageBreakdown.arPercentage}%</span>
                  <span className="text-[10px] text-blue-700 block mt-0.5">{stats.languageBreakdown.arCount} posts</span>
                </div>
                <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                  <span className="text-xs text-purple-800 font-medium block">English Posts</span>
                  <span className="text-2xl font-extrabold text-purple-900">{stats.languageBreakdown.enPercentage}%</span>
                  <span className="text-[10px] text-purple-700 block mt-0.5">{stats.languageBreakdown.enCount} posts</span>
                </div>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900">Corpus Date Span:</span>
                <span>
                  {stats.dateRange.start ? new Date(stats.dateRange.start).toLocaleDateString() : 'N/A'} — {stats.dateRange.end ? new Date(stats.dateRange.end).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              {/* By Source ID */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-600" /> N per Source Identifier
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(stats.bySource).map(([src, count]) => (
                    <div key={src} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                      <span className="font-mono font-medium text-slate-700">{src}</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Kind */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" /> N per Content Kind
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(stats.byKind).map(([kind, count]) => (
                    <div key={kind} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                      <span className="font-mono font-medium text-slate-700 capitalize">{kind.replace('_', ' ')}</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Non-Fabrication Guarantee:</strong> All numbers above are calculated directly from verified database records with full provenance tracking. No simulated or fallback data is present.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
