import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Database, HelpCircle } from 'lucide-react';

interface BatchHistory {
  batchId: string;
  mclQueryNote: string;
  exportDate: string;
  totalRows: number;
  importedRows: number;
  duplicatesSkipped: number;
  importedAt: string;
}

export const MetaImportAdmin: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Mapping state
  const [textCol, setTextCol] = useState('');
  const [authorCol, setAuthorCol] = useState('');
  const [timestampCol, setTimestampCol] = useState('');
  const [likesCol, setLikesCol] = useState('');
  const [repliesCol, setRepliesCol] = useState('');
  const [platformCol, setPlatformCol] = useState('');
  const [urlCol, setUrlCol] = useState('');

  const [exportDate, setExportDate] = useState(new Date().toISOString().split('T')[0]);
  const [mclQueryNote, setMclQueryNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successResult, setSuccessResult] = useState<{ importedCount: number; duplicatesCount: number; batchId: string } | null>(null);
  const [batches, setBatches] = useState<BatchHistory[]>([]);

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/admin/import-meta/batches');
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (e) {
      console.error('Failed to fetch import batches:', e);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setSuccessResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      if (selectedFile.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          const rows = Array.isArray(parsed) ? parsed : [parsed];
          setRawRows(rows);
          if (rows.length > 0) {
            const keys = Object.keys(rows[0]);
            setHeaders(keys);
            autoMapHeaders(keys);
            setPreviewRows(rows.slice(0, 5));
          }
        } catch (err: any) {
          setErrors([`JSON Parse Error: ${err.message}`]);
        }
      } else {
        // Simple CSV parser
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setErrors(['CSV file must contain at least a header row and 1 data row.']);
          return;
        }

        const cols = lines[0].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        setHeaders(cols);
        autoMapHeaders(cols);

        const parsedRows: Record<string, any>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, any> = {};
          cols.forEach((col, idx) => {
            rowObj[col] = values[idx] !== undefined ? values[idx] : '';
          });
          parsedRows.push(rowObj);
        }

        setRawRows(parsedRows);
        setPreviewRows(parsedRows.slice(0, 5));
      }
    };

    reader.readAsText(selectedFile);
  };

  const autoMapHeaders = (keys: string[]) => {
    keys.forEach(k => {
      const lower = k.toLowerCase();
      if (lower.includes('text') || lower.includes('content') || lower.includes('post') || lower.includes('message') || lower.includes('comment')) {
        setTextCol(k);
      } else if (lower.includes('author') || lower.includes('user') || lower.includes('username') || lower.includes('creator')) {
        setAuthorCol(k);
      } else if (lower.includes('time') || lower.includes('date') || lower.includes('created') || lower.includes('timestamp')) {
        setTimestampCol(k);
      } else if (lower.includes('like') || lower.includes('upvote') || lower.includes('reactions')) {
        setLikesCol(k);
      } else if (lower.includes('comment') || lower.includes('reply') || lower.includes('replies') || lower.includes('share')) {
        setRepliesCol(k);
      } else if (lower.includes('platform') || lower.includes('source')) {
        setPlatformCol(k);
      } else if (lower.includes('url') || lower.includes('link') || lower.includes('permalink')) {
        setUrlCol(k);
      }
    });
  };

  const handleImport = async () => {
    if (!textCol) {
      setErrors(['Please map the required Text/Content column before proceeding.']);
      return;
    }
    if (!exportDate) {
      setErrors(['Export Date is required.']);
      return;
    }

    try {
      setSubmitting(true);
      setErrors([]);
      setSuccessResult(null);

      const res = await fetch('/api/admin/import-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawRows,
          columnMapping: {
            textCol,
            authorCol,
            timestampCol,
            likesCol,
            repliesCol,
            platformCol,
            urlCol,
          },
          exportDate,
          mclQueryNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrors(data.errors || [data.error || 'Import failed with server error']);
      } else {
        setSuccessResult({
          importedCount: data.importedCount,
          duplicatesCount: data.duplicatesCount,
          batchId: data.batchId,
        });
        fetchBatches();
      }
    } catch (e: any) {
      setErrors([`Network/Server Error: ${e.message}`]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Database className="w-7 h-7 text-emerald-700" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meta Content Library (MCL) Import Admin</h1>
            <p className="text-sm text-slate-600">
              Ingest offline CSV/JSON exports with column mapping, content-hash deduplication, row validation, and provenance tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Upload & Settings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-600" /> 1. Upload Export File
          </h2>

          <label className="block border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-slate-700 block">
              {file ? file.name : 'Select CSV or JSON File'}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Exported from Meta Content Library</span>
            <input type="file" accept=".csv,.json" onChange={handleFileSelect} className="hidden" />
          </label>

          {file && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold">{rawRows.length}</span> data rows detected.
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Export Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={exportDate}
                onChange={e => setExportDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-500">
                Maps to <code className="bg-slate-100 px-1 rounded">provenance.fetchedAt</code> (NOT upload time)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MCL Query / Search Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={mclQueryNote}
                onChange={e => setMclQueryNote(e.target.value)}
                placeholder="e.g. Query: 'Jordan sports OR BRT' | Date Range: 2026-05-01 to 2026-06-01"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Column Mapping Section */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> 2. Map Column Schema
          </h2>

          {headers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              Upload a file to configure column mapping.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Text / Content Column <span className="text-red-500">*</span>
                </label>
                <select value={textCol} onChange={e => setTextCol(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="">-- Select Column --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Author / User Column</label>
                <select value={authorCol} onChange={e => setAuthorCol(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="">-- None / Default --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Post Timestamp Column</label>
                <select value={timestampCol} onChange={e => setTimestampCol(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="">-- Fallback to Export Date --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Likes / Reactions Count Column</label>
                <select value={likesCol} onChange={e => setLikesCol(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="">-- Set as Null --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comments / Replies Count Column</label>
                <select value={repliesCol} onChange={e => setRepliesCol(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="">-- Set as Null --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL / Link Column</label>
                <select value={urlCol} onChange={e => setUrlCol(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="">-- Set as Null --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Validation & Submit CTA */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Provenance will be tagged as <code className="bg-slate-100 px-1 rounded">meta_import</code> with SHA-256 author hashing.
            </div>
            <button
              onClick={handleImport}
              disabled={submitting || !file || !textCol}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-medium text-sm rounded-lg transition-colors shadow-xs"
            >
              {submitting ? 'Validating & Processing Batch...' : 'Process & Ingest Batch'}
            </button>
          </div>
        </div>
      </div>

      {/* Line-Numbered Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
            <AlertCircle className="w-5 h-5" /> Validation Errors Found ({errors.length} issues). Batch Ingestion Aborted.
          </div>
          <p className="text-xs text-red-700">
            Per platform data integrity rules, bad rows are rejected with line numbers rather than silently coerced. Please fix these lines in your export file and re-upload:
          </p>
          <div className="bg-red-950 text-red-200 font-mono text-xs p-3 rounded-lg max-h-60 overflow-y-auto space-y-1">
            {errors.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </div>
        </div>
      )}

      {/* Success Result Message */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-semibold text-emerald-900 text-base">Import Batch Completed Successfully!</h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Ingested <span className="font-bold">{successResult.importedCount}</span> verified comments into database cache. Skipped <span className="font-bold">{successResult.duplicatesCount}</span> duplicate records (content hash match). Batch ID: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono text-[11px]">{successResult.batchId}</code>.
            </p>
          </div>
        </div>
      )}

      {/* Batch History Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" /> Historical Meta Import Batches
        </h2>

        {batches.length === 0 ? (
          <div className="text-sm text-slate-500 italic py-4">No Meta Content Library batches recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-900 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-3">Batch ID</th>
                  <th className="p-3">Query Note</th>
                  <th className="p-3">Export Date</th>
                  <th className="p-3">Total Rows</th>
                  <th className="p-3">Imported</th>
                  <th className="p-3">Duplicates Skipped</th>
                  <th className="p-3">Imported At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map(b => (
                  <tr key={b.batchId} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-medium">{b.batchId}</td>
                    <td className="p-3 max-w-xs truncate">{b.mclQueryNote}</td>
                    <td className="p-3">{b.exportDate}</td>
                    <td className="p-3">{b.totalRows}</td>
                    <td className="p-3 font-semibold text-emerald-700">{b.importedRows}</td>
                    <td className="p-3 text-slate-500">{b.duplicatesSkipped}</td>
                    <td className="p-3">{new Date(b.importedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
