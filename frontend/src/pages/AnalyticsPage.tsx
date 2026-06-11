import { useEffect, useState } from 'react';
import { listDocuments, getSystemStatus } from '../api';
import type { DocumentMetadata, SystemStatus } from '../types';
import { useUsageStore } from '../services/usage';

export default function AnalyticsPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: usageData, fetchUsageIfStale } = useUsageStore();

  useEffect(() => {
    fetchUsageIfStale();
    Promise.all([
      listDocuments().then(setDocuments).catch(() => setDocuments([])),
      getSystemStatus().then(setStatus).catch(() => null),
    ]).finally(() => setLoading(false));
  }, [fetchUsageIfStale]);

  const totalChunks = documents.reduce((s, d) => s + d.chunks, 0);
  const maxChunks = Math.max(...documents.map(d => d.chunks), 1);
  const sortedByChunks = [...documents].sort((a, b) => b.chunks - a.chunks).slice(0, 8);
  const recentDocs = [...documents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 6);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-outline font-black">Intelligence</p>
        <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Analytics Overview</h3>
        <p className="text-on-surface-variant text-sm mt-1">Insights into your knowledge base usage and performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon="description" label="Documents" value={loading ? '…' : documents.length.toString()} color="primary" />
        <StatCard icon="segment" label="Total Chunks" value={loading ? '…' : totalChunks.toString()} color="secondary" />
        <StatCard
          icon="smart_toy"
          label="AI Usage"
          value={usageData ? `${usageData.percentage}%` : '…'}
          color="tertiary"
        />
        <StatCard icon="database" label="Vector Store" value={status?.vector_store || '…'} color="primary" />
      </div>

      {/* Chart: Documents by Chunk Count */}
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-5">
          <h4 className="font-headline font-bold text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-primary/60">bar_chart</span>
            Top Documents by Chunk Count
          </h4>
          <span className="text-[10px] text-outline uppercase tracking-widest font-bold">
            {sortedByChunks.length} of {documents.length}
          </span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton w-full h-10 rounded-xl" />)}
          </div>
        ) : sortedByChunks.length === 0 ? (
          <EmptyState icon="bar_chart" message="No documents to chart. Upload documents to see analytics." />
        ) : (
          <div className="space-y-3">
            {sortedByChunks.map((doc, i) => (
              <div key={doc.document_id} className="group" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-on-surface truncate max-w-[60%] font-medium">{doc.file_name}</span>
                  <span className="text-[11px] text-on-surface-variant font-mono">{doc.chunks} chunks</span>
                </div>
                <div className="w-full h-3 bg-surface-container-highest/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-700 ease-out-expo"
                    style={{ width: `${(doc.chunks / maxChunks) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Breakdown */}
      {usageData && (
        <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <h4 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary/60">donut_large</span>
            AI Usage Breakdown
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-highest/50 p-4 rounded-xl border border-outline-variant/10">
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Used</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{usageData.used}</p>
            </div>
            <div className="bg-surface-container-highest/50 p-4 rounded-xl border border-outline-variant/10">
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Remaining</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{usageData.remaining}</p>
            </div>
            <div className="bg-surface-container-highest/50 p-4 rounded-xl border border-outline-variant/10">
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Plan Limit</p>
              <p className="text-2xl font-bold text-on-surface font-headline">{usageData.limit}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full h-2.5 bg-surface-container-highest/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${usageData.percentage > 80 ? 'bg-error' : 'bg-gradient-to-r from-primary to-tertiary'}`}
                style={{ width: `${usageData.percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-outline">{usageData.percentage}% used</span>
              <span className="text-[10px] text-outline">Resets: {new Date(usageData.reset_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Documents Table */}
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h4 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary/60">schedule</span>
          Recent Activity
        </h4>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton w-full h-12 rounded-xl" />)}
          </div>
        ) : recentDocs.length === 0 ? (
          <EmptyState icon="folder_off" message="No documents found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-outline-variant/10">
                  <th className="py-2 pr-4 text-[10px] uppercase tracking-widest text-outline font-bold">File</th>
                  <th className="py-2 pr-4 text-[10px] uppercase tracking-widest text-outline font-bold">Pages</th>
                  <th className="py-2 pr-4 text-[10px] uppercase tracking-widest text-outline font-bold">Chunks</th>
                  <th className="py-2 text-[10px] uppercase tracking-widest text-outline font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map(doc => (
                  <tr key={doc.document_id} className="border-b border-outline-variant/5 hover:bg-surface-container-highest/30 transition-colors">
                    <td className="py-3 pr-4 font-medium text-on-surface truncate max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary/50">description</span>
                        {doc.file_name}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{doc.pages}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{doc.chunks}</td>
                    <td className="py-3 text-on-surface-variant text-xs">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-container/40 border border-outline-variant/15 p-4 sm:p-5 rounded-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-base text-${color}/60`}>{icon}</span>
        <span className="text-[10px] uppercase tracking-widest text-outline font-bold">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-on-surface font-headline tracking-tight">{value}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-8">
      <span className="material-symbols-outlined text-4xl text-outline/30 mb-3 block">{icon}</span>
      <p className="text-sm text-on-surface-variant">{message}</p>
    </div>
  );
}
