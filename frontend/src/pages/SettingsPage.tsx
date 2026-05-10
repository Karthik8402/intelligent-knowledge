import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api';
import type { Settings } from '../types';
import { showToast } from '../shared/Toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const modelOptions: Record<string, string[]> = {
    google: ['gemini-2.5-flash-lite', 'gemini-1.5-pro', 'gemma-3-27b-it'],
    nvidia: ['minimaxai/minimax-m2.7'],
  };

  useEffect(() => {
    void getSettings().then(setSettings).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
      showToast('success', 'Settings Applied', 'Configuration updated in memory (resets on server restart)');
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return (
    <div className="flex flex-col gap-6 max-w-3xl animate-fade-in-up">
      <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight mb-2">Engine Settings</h3>
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-8 rounded-2xl sm:rounded-3xl space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton w-32 h-3 mb-3" />
            <div className="skeleton w-full h-12 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-3xl">
      <div className="animate-fade-in-up">
        <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight mb-2">Engine Settings</h3>
        <p className="text-on-surface-variant text-sm">Configure the RAG pipeline parameters. Changes apply in memory until server restart.</p>
      </div>
      
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-8 rounded-2xl sm:rounded-3xl backdrop-blur-xl space-y-6 sm:space-y-7 animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-outline font-black">Retrieval</p>
            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary/60">tune</span>
                RAG Top K
              </label>
              <input
                type="number"
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
                value={settings.rag_top_k}
                min={1}
                max={20}
                onChange={(e) => setSettings({ ...settings, rag_top_k: Number(e.target.value) })}
              />
              <p className="text-xs text-on-surface-variant mt-2">How many chunks are injected into the LLM context.</p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary/60">segment</span>
                Chunk Size
              </label>
              <input
                type="number"
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
                value={settings.rag_chunk_size}
                min={100}
                max={4000}
                onChange={(e) => setSettings({ ...settings, rag_chunk_size: Number(e.target.value) })}
              />
              <p className="text-xs text-on-surface-variant mt-2">Target chunk size for text splitting.</p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary/60">horizontal_rule</span>
                Chunk Overlap
              </label>
              <input
                type="number"
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
                value={settings.rag_chunk_overlap}
                min={0}
                max={1000}
                onChange={(e) => setSettings({ ...settings, rag_chunk_overlap: Number(e.target.value) })}
              />
              <p className="text-xs text-on-surface-variant mt-2">Overlap to keep continuity between chunks.</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-outline font-black">Models</p>
            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-tertiary/60">smart_toy</span>
                LLM Provider
              </label>
              <select
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300 cursor-pointer"
                value={settings.llm_provider}
                onChange={(e) => {
                  const nextProvider = e.target.value;
                  const nextModels = modelOptions[nextProvider] || [];
                  const nextModel = nextModels.includes(settings.llm_model)
                    ? settings.llm_model
                    : (nextModels[0] || settings.llm_model);
                  setSettings({ ...settings, llm_provider: nextProvider, llm_model: nextModel });
                }}
              >
                <option value="google">Google (Gemini / Gemma)</option>
                <option value="nvidia">NVIDIA (AI Endpoints)</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-tertiary/60">frame_source</span>
                LLM Model
              </label>
              <select
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300 cursor-pointer"
                value={settings.llm_model}
                onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
              >
                {(modelOptions[settings.llm_provider] || [settings.llm_model]).map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
                {!modelOptions[settings.llm_provider]?.includes(settings.llm_model) && (
                  <option value={settings.llm_model}>{settings.llm_model}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary/60">auto_awesome</span>
                Embedding Model
              </label>
              <input
                type="text"
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
                value={settings.embedding_model}
                onChange={(e) => setSettings({ ...settings, embedding_model: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary/60">database</span>
                Vector Store
              </label>
              <select
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300 cursor-pointer"
                value={settings.vector_store}
                onChange={(e) => setSettings({ ...settings, vector_store: e.target.value })}
              >
                <option value="chroma">ChromaDB (recommended)</option>
                <option value="faiss">FAISS (in-memory)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-outline font-black">Sampling</p>
            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary/60">thermostat</span>
                Temperature
              </label>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
                value={settings.llm_temperature}
                onChange={(e) => setSettings({ ...settings, llm_temperature: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary/60">filter_alt</span>
                Top P
              </label>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
                value={settings.llm_top_p}
                onChange={(e) => setSettings({ ...settings, llm_top_p: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-outline font-black">Limits</p>
            <div>
              <label className="text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary/60">cloud_upload</span>
                Max Upload Size (MB)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
                value={settings.max_upload_size_mb}
                onChange={(e) => setSettings({ ...settings, max_upload_size_mb: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-on-primary-fixed p-3 rounded-xl font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(181,196,255,0.3)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className={`material-symbols-outlined text-lg transition-transform duration-500 ${saving ? 'animate-spin' : ''}`}>
              {saving ? 'progress_activity' : 'save'}
            </span>
            <span>{saving ? 'Synchronizing...' : 'Apply Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-surface-container-low border border-outline-variant/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary/60 text-lg mt-0.5 flex-shrink-0">info</span>
          <div className="text-xs text-on-surface-variant leading-relaxed space-y-1">
            <p><strong className="text-on-surface">In-memory only:</strong> Settings changes do not persist across server restarts.</p>
            <p>To make permanent changes, update your <code className="bg-surface-container-highest px-1.5 py-0.5 rounded text-primary text-[11px]">.env</code> file in the backend directory.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
