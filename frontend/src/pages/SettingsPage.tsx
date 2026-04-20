import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api';
import type { Settings } from '../types';

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
      alert('Settings updated (Mocked Memory Write)');
    } catch (e) {
      console.error(e);
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-8 text-primary animate-pulse font-bold tracking-widest uppercase">Fetching AI Configuration...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h3 className="font-headline text-3xl font-bold tracking-tight mb-2">Engine Settings</h3>
      
      <div className="bg-surface-container/40 border border-outline-variant/15 p-8 rounded-3xl backdrop-blur-xl space-y-6">
         <div>
            <label className="block text-xs uppercase tracking-widest text-outline font-bold mb-2">RAG Top K Retrieval</label>
            <input 
               type="number" 
               className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50"
               value={settings.rag_top_k}
               onChange={(e) => setSettings({...settings, rag_top_k: Number(e.target.value)})}
            />
            <p className="text-xs text-on-surface-variant mt-2">Determines how many vector chunks are injected into the LLM context simultaneously.</p>
         </div>

         <div>
            <label className="block text-xs uppercase tracking-widest text-outline font-bold mb-2">LLM Provider</label>
            <select 
               className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50"
               value={settings.llm_provider}
               onChange={(e) => setSettings({...settings, llm_provider: e.target.value})}
            >
               <option value="gemini">Google Gemini (gemma|gemini-1.5-pro)</option>
               <option value="openai">OpenAI (gpt-3.5-turbo|gpt-4)</option>
               <option value="anthropic">Anthropic (claude-3)</option>
            </select>
         </div>

         <div className="pt-4 border-t border-outline-variant/10">
            <button 
               onClick={handleSave} 
               disabled={saving}
               className="w-full bg-primary text-on-primary-fixed p-3 rounded-xl hover:opacity-90 transition-opacity font-bold"
            >
               {saving ? 'Synchronizing...' : 'Apply Configuration'}
            </button>
         </div>
      </div>
    </div>
  );
}
