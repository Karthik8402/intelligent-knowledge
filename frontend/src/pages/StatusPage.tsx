import { useEffect, useState } from 'react';
import { getSystemStatus } from '../api';
import type { SystemStatus } from '../types';

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    void getSystemStatus().then(setStatus).catch(console.error);
  }, []);

  if (!status) return <div className="p-8 text-primary animate-pulse font-bold tracking-widest uppercase">Connecting to Obsidian Core...</div>;

  return (
    <div className="flex flex-col gap-6">
      <h3 className="font-headline text-3xl font-bold tracking-tight mb-2">Systems Output</h3>
      
      <div className="grid grid-cols-12 gap-6 w-full">
        <div className="col-span-8 bg-surface-container/40 border border-outline-variant/15 p-8 rounded-3xl backdrop-blur-xl">
           <p className="text-outline uppercase tracking-widest text-xs font-bold mb-6">Core Telemetry</p>
           <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                 <span className="text-on-surface-variant font-medium">Vector Engine</span>
                 <span className="font-mono text-primary bg-primary/10 px-3 py-1 rounded-full text-sm font-bold uppercase">{status.vector_store}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                 <span className="text-on-surface-variant font-medium">Primary LLM Provider</span>
                 <span className="font-mono text-tertiary bg-tertiary/10 px-3 py-1 rounded-full text-sm font-bold uppercase">{status.llm_provider}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                 <span className="text-on-surface-variant font-medium">RAG Memory Pool</span>
                 <span><strong className="text-xl text-on-surface">{status.chunks}</strong> embeddings loaded</span>
              </div>
           </div>
        </div>

        <div className="col-span-4 flex flex-col gap-6">
           <div className="h-full bg-surface-container-high/60 border border-outline-variant/15 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between">
              <span className={`material-symbols-outlined text-4xl ${status.store_initialized ? 'text-primary' : 'text-error'}`}>
                 {status.store_initialized ? 'verified' : 'gpp_bad'}
              </span>
              <div>
                 <p className="font-headline font-bold text-xl mb-1">Index State</p>
                 <p className={`text-xs font-bold uppercase tracking-wide ${status.store_initialized ? 'text-primary' : 'text-error'}`}>
                    {status.store_initialized ? 'ONLINE' : 'FATAL: NO API KEYS'}
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
