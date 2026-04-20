import { useState } from 'react';
import { chat } from '../api';
import type { ChatResponse } from '../types';

type Message = { role: 'user' | 'assistant'; text: string; data?: ChatResponse };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await chat(q);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer, data: res }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] relative pb-32">
      <div className="flex-grow space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <span className="material-symbols-outlined text-4xl mb-4">robot_2</span>
            <p className="font-headline text-xl">What would you like to know from your knowledge base?</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-5 rounded-3xl backdrop-blur-xl border border-outline-variant/15 ${
                msg.role === 'user'
                  ? 'bg-surface-container-highest rounded-br-none'
                  : 'bg-surface-container-low rounded-tl-none border-t-outline-variant/30 border-l-outline-variant/30'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {msg.role === 'assistant' && msg.data && msg.data.citations.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <p className="w-full text-[10px] uppercase tracking-widest text-outline mb-1">Citations</p>
                  {msg.data.citations.map((cite, idx) => (
                    <div key={idx} className="group relative cursor-pointer px-3 py-1 bg-secondary-container/20 rounded-full border border-secondary/20 hover:bg-secondary-container/40 transition-colors">
                      <span className="text-[10px] text-on-secondary-container font-medium">#{idx + 1} {cite.file_name}</span>
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-surface-container-highest rounded-xl hidden group-hover:block z-50 text-xs shadow-xl border border-outline-variant/20">
                        {cite.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-5 bg-surface-container-low rounded-3xl rounded-tl-none border border-outline-variant/15 flex gap-2 items-center">
               <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"></span>
               <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse delay-75"></span>
               <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse delay-150"></span>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-8 left-[320px] right-8 z-40 max-w-4xl mx-auto">
        <div className="bg-surface-container-high/90 backdrop-blur-2xl border border-outline-variant/20 p-2 rounded-2xl shadow-2xl flex items-center gap-3">
           <button className="p-3 text-outline hover:text-on-surface transition-colors">
             <span className="material-symbols-outlined">add_circle</span>
           </button>
           <input 
             className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-outline font-medium text-sm" 
             placeholder="Ask your knowledge base anything..." 
             type="text" 
             value={input}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             onChange={(e) => setInput(e.target.value)}
           />
           <button className="bg-primary text-on-primary-fixed p-3 rounded-xl hover:opacity-90 transition-opacity" onClick={handleSend} disabled={loading}>
             <span className="material-symbols-outlined">send</span>
           </button>
        </div>
      </div>
    </div>
  );
}
