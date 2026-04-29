import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api';
import type { Settings } from '../types';
import { showToast } from '../components/Toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

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
      
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-8 rounded-2xl sm:rounded-3xl backdrop-blur-xl space-y-5 sm:space-y-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
        {/* RAG Top K */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <label className="block text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary/60">tune</span>
            RAG Top K Retrieval
          </label>
          <input 
            type="number" 
            className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300"
            value={settings.rag_top_k}
            min={1}
            max={20}
            onChange={(e) => setSettings({...settings, rag_top_k: Number(e.target.value)})}
          />
          <p className="text-xs text-on-surface-variant mt-2">Determines how many vector chunks are injected into the LLM context simultaneously.</p>
        </div>

        {/* LLM Provider */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <label className="block text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-tertiary/60">smart_toy</span>
            LLM Provider
          </label>
          <select 
            className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300 cursor-pointer"
            value={settings.llm_provider}
            onChange={(e) => setSettings({...settings, llm_provider: e.target.value})}
          >
            <option value="google">Google (gemma | gemini-1.5-pro)</option>
            <option value="openai">OpenAI (gpt-3.5-turbo | gpt-4)</option>
            <option value="groq">Groq (mixtral | llama3)</option>
          </select>
        </div>

        {/* Vector Store */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <label className="block text-xs uppercase tracking-widest text-outline font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-secondary/60">database</span>
            Vector Store
          </label>
          <select 
            className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50 focus-glow transition-all duration-300 cursor-pointer"
            value={settings.vector_store}
            onChange={(e) => setSettings({...settings, vector_store: e.target.value})}
          >
            <option value="chroma">ChromaDB (recommended)</option>
            <option value="faiss">FAISS (in-memory)</option>
          </select>
        </div>

        {/* Save button */}
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
