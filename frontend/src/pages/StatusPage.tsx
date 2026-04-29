import { useEffect, useState } from 'react';
import { getSystemStatus, getHealth } from '../api';
import type { SystemStatus } from '../types';
import { StatusSkeleton } from '../components/Skeleton';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return <span>{display}</span>;
}

type HealthData = {
  status: string;
  uptime_seconds: number;
  version: string;
  python_version: string;
  disk_free_mb: number;
  checks: Record<string, boolean>;
};

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    void getSystemStatus().then(setStatus).catch(console.error);
    void getHealth().then(d => setHealth(d as HealthData)).catch(console.error);
  }, []);

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (!status) return (
    <div className="flex flex-col gap-6">
      <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight mb-2 animate-fade-in-up">System Status</h3>
      <StatusSkeleton />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight mb-2 animate-fade-in-up">System Status</h3>
      
      {/* Health banner */}
      {health && (
        <div className={`flex flex-wrap items-center gap-4 sm:gap-6 px-5 sm:px-6 py-4 rounded-2xl border animate-scale-in ${
          health.status === 'healthy'
            ? 'bg-[#2dd36f]/5 border-[#2dd36f]/20'
            : 'bg-error/5 border-error/20'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${health.status === 'healthy' ? 'bg-[#2dd36f] animate-pulse-glow' : 'bg-error'}`} />
            <span className="text-sm font-bold text-on-surface uppercase tracking-wide">{health.status}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-primary/50">schedule</span>
              Uptime: <strong className="text-on-surface">{formatUptime(health.uptime_seconds)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-primary/50">tag</span>
              v{health.version}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-primary/50">memory</span>
              Python {health.python_version}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-primary/50">hard_drive</span>
              {health.disk_free_mb} MB free
            </span>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full">
        {/* Core Telemetry Card */}
        <div className="lg:col-span-8 bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-8 rounded-2xl sm:rounded-3xl backdrop-blur-xl animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
          <p className="text-outline uppercase tracking-widest text-xs font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            Core Telemetry
          </p>
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 border-b border-outline-variant/10 pb-4 group hover:border-primary/20 transition-colors duration-300">
              <span className="text-on-surface-variant font-medium flex items-center gap-3">
                <span className="material-symbols-outlined text-primary/60 text-lg">memory</span>
                Vector Engine
              </span>
              <span className="font-mono text-primary bg-primary/10 px-3 py-1 rounded-full text-sm font-bold uppercase hover-scale self-start sm:self-auto">
                {status.vector_store}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 border-b border-outline-variant/10 pb-4 group hover:border-tertiary/20 transition-colors duration-300">
              <span className="text-on-surface-variant font-medium flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary/60 text-lg">smart_toy</span>
                Primary LLM Provider
              </span>
              <span className="font-mono text-tertiary bg-tertiary/10 px-3 py-1 rounded-full text-sm font-bold uppercase hover-scale self-start sm:self-auto">
                {status.llm_provider}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 border-b border-outline-variant/10 pb-4">
              <span className="text-on-surface-variant font-medium flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary/60 text-lg">database</span>
                RAG Memory Pool
              </span>
              <span>
                <strong className="text-xl text-on-surface">
                  <AnimatedNumber value={status.chunks} />
                </strong>
                <span className="text-on-surface-variant text-sm ml-1">embeddings</span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className="text-on-surface-variant font-medium flex items-center gap-3">
                <span className="material-symbols-outlined text-primary/60 text-lg">description</span>
                Indexed Documents
              </span>
              <span>
                <strong className="text-xl text-on-surface">
                  <AnimatedNumber value={status.documents} />
                </strong>
                <span className="text-on-surface-variant text-sm ml-1">files</span>
              </span>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6">
          <div className="bg-surface-container-high/60 border border-outline-variant/15 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-xl flex flex-col justify-between min-h-[140px] animate-slide-in-right" style={{ animationDelay: '0.15s' }}>
            <span className={`material-symbols-outlined text-3xl sm:text-4xl transition-all duration-500 ${status.store_initialized ? 'text-[#2dd36f] animate-pulse-glow' : 'text-error'}`}>
              {status.store_initialized ? 'verified' : 'gpp_bad'}
            </span>
            <div className="mt-3">
              <p className="font-headline font-bold text-lg sm:text-xl mb-1">Index State</p>
              <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${status.store_initialized ? 'text-[#2dd36f]' : 'text-error'}`}>
                {status.store_initialized ? 'ONLINE' : 'FATAL: NO API KEYS'}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-high/60 border border-outline-variant/15 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-xl flex flex-col justify-between min-h-[140px] animate-slide-in-right" style={{ animationDelay: '0.25s' }}>
            <span className={`material-symbols-outlined text-3xl sm:text-4xl transition-all duration-500 ${status.embeddings_loaded ? 'text-[#2dd36f] animate-pulse-glow' : 'text-error'}`}>
              {status.embeddings_loaded ? 'neurology' : 'error'}
            </span>
            <div className="mt-3">
              <p className="font-headline font-bold text-lg sm:text-xl mb-1">Embeddings</p>
              <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${status.embeddings_loaded ? 'text-[#2dd36f]' : 'text-error'}`}>
                {status.embeddings_loaded ? 'LOADED' : 'UNAVAILABLE'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health checks detail */}
      {health?.checks && (
        <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary/50">checklist</span>
            Health Checks
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(health.checks).map(([key, ok]) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/10">
                <span className={`material-symbols-outlined text-base ${ok ? 'text-[#2dd36f]' : 'text-error'}`}>
                  {ok ? 'check_circle' : 'cancel'}
                </span>
                <span className="text-xs text-on-surface font-medium">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
