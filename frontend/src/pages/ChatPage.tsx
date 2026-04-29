import { useCallback, useEffect, useRef, useState } from 'react';
import { chat, chatStream } from '../api';
import type { ChatResponse, Citation } from '../types';

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
type Message = { role: 'user' | 'assistant'; text: string; data?: ChatResponse };

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

/* ──────────────────────────────────────────────
   LocalStorage helpers
   ────────────────────────────────────────────── */
const STORAGE_KEY = 'obsidian_chat_sessions';

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ──────────────────────────────────────────────
   Simple Markdown renderer (no external deps)
   Handles: **bold**, *italic*, `code`, ```blocks```,
   - bullet lists, numbered lists, and line breaks
   ────────────────────────────────────────────── */
function renderMarkdown(text: string) {
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, pi) => {
    // Code block
    if (part.startsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0]?.trim() || '';
      const code = (lang ? lines.slice(1) : lines).join('\n').trim();
      return (
        <div key={pi} className="my-3 rounded-xl overflow-hidden border border-outline-variant/20">
          {lang && (
            <div className="bg-surface-container-highest px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-outline border-b border-outline-variant/15">
              {lang}
            </div>
          )}
          <pre className="bg-surface-container-high/60 px-4 py-3 overflow-x-auto text-xs leading-relaxed custom-scrollbar">
            <code className="text-primary/90">{code}</code>
          </pre>
        </div>
      );
    }

    // Regular text — process inline formatting
    const lines = part.split('\n');
    return (
      <span key={pi}>
        {lines.map((line, li) => {
          const trimmed = line.trim();

          // Bullet list
          if (/^[-•]\s/.test(trimmed)) {
            return (
              <div key={li} className="flex gap-2 ml-1 my-0.5">
                <span className="text-primary/50 mt-0.5">•</span>
                <span>{renderInline(trimmed.slice(2))}</span>
              </div>
            );
          }

          // Numbered list
          if (/^\d+[.)]\s/.test(trimmed)) {
            const num = trimmed.match(/^(\d+)[.)]\s/)![1];
            const rest = trimmed.replace(/^\d+[.)]\s/, '');
            return (
              <div key={li} className="flex gap-2 ml-1 my-0.5">
                <span className="text-primary/50 font-medium min-w-[1.2em] text-right">{num}.</span>
                <span>{renderInline(rest)}</span>
              </div>
            );
          }

          // Heading-like lines (## or ###)
          if (/^#{1,3}\s/.test(trimmed)) {
            const content = trimmed.replace(/^#{1,3}\s/, '');
            return <p key={li} className="font-bold text-on-surface mt-3 mb-1">{content}</p>;
          }

          // Empty line → spacing
          if (!trimmed) return <div key={li} className="h-2" />;

          // Regular paragraph
          return <p key={li} className="my-0.5">{renderInline(line)}</p>;
        })}
      </span>
    );
  });
}

/** Inline formatting: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode {
  // Split by inline code, bold, italic
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((t, i) => {
    if (t.startsWith('**') && t.endsWith('**')) {
      return <strong key={i} className="font-bold text-on-surface">{t.slice(2, -2)}</strong>;
    }
    if (t.startsWith('*') && t.endsWith('*')) {
      return <em key={i} className="italic text-on-surface/80">{t.slice(1, -1)}</em>;
    }
    if (t.startsWith('`') && t.endsWith('`')) {
      return <code key={i} className="bg-surface-container-highest/80 text-primary px-1.5 py-0.5 rounded text-[11px] font-mono">{t.slice(1, -1)}</code>;
    }
    return t;
  });
}

/* ──────────────────────────────────────────────
   Suggestion cards
   ────────────────────────────────────────────── */
const suggestions = [
  { icon: 'summarize',     label: 'Summarize',        desc: 'Concise summary of your documents',          prompt: 'Give me a comprehensive summary of the uploaded documents' },
  { icon: 'compare',       label: 'Compare',          desc: 'Similarities & differences across docs',     prompt: 'Compare the key themes across the uploaded documents' },
  { icon: 'search',        label: 'Extract',          desc: 'Pull out specific data points or facts',     prompt: 'What are the most important facts in the documents?' },
  { icon: 'analytics',     label: 'Analyze',          desc: 'Deep analysis of content patterns',          prompt: 'Analyze the main arguments and conclusions in the documents' },
  { icon: 'help',          label: 'Explain',          desc: 'Plain-language explanations of topics',       prompt: 'Explain the key concepts from the documents in simple terms' },
  { icon: 'format_list_bulleted', label: 'Key Points', desc: 'Bullet the most critical takeaways',        prompt: 'List the key points and takeaways from the documents' },
];

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function ChatPage() {
  const [sessions, setSessions]         = useState<ChatSession[]>(loadSessions);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [copiedIdx, setCopiedIdx]       = useState<number | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

  useEffect(() => { saveSessions(sessions); }, [sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setInput('');
    setHistoryOpen(false);
  }, []);

  const updateSession = useCallback((id: string, newMessages: Message[], title?: string) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], messages: newMessages, updatedAt: Date.now(), ...(title ? { title } : {}) };
      return updated;
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');

    let sessionId = activeId;
    let currentMessages = [...messages];

    if (!sessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: q.length > 50 ? q.slice(0, 50) + '…' : q,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      sessionId = newSession.id;
      setSessions((prev) => [newSession, ...prev]);
      setActiveId(sessionId);
      currentMessages = [];
    }

    const withUser: Message[] = [...currentMessages, { role: 'user', text: q }];
    updateSession(sessionId, withUser);
    setLoading(true);

    // Try SSE streaming first, fall back to standard chat
    let streamedText = '';
    let streamCitations: Citation[] = [];

    try {
      await chatStream(
        q,
        // onToken: append token and update session in real-time
        (token) => {
          streamedText += token;
          updateSession(sessionId!, [...withUser, { role: 'assistant', text: streamedText }]);
        },
        // onCitations: store citations
        (citations) => {
          streamCitations = citations;
        },
        // onDone: finalize with citations
        () => {
          const finalData: ChatResponse = {
            answer: streamedText,
            citations: streamCitations,
            retrieved_chunks: [],
          };
          updateSession(sessionId!, [...withUser, { role: 'assistant', text: streamedText, data: finalData }]);
          setLoading(false);
        },
        // onError: fall back to standard chat
        async (error) => {
          console.warn('Stream failed, falling back to standard chat:', error);
          try {
            const res = await chat(q);
            updateSession(sessionId!, [...withUser, { role: 'assistant', text: res.answer, data: res }]);
          } catch (e2: any) {
            updateSession(sessionId!, [...withUser, { role: 'assistant', text: `Error: ${e2.message}` }]);
          } finally {
            setLoading(false);
          }
        },
      );
    } catch (e: any) {
      // Network-level failure — fall back to standard chat
      try {
        const res = await chat(q);
        updateSession(sessionId!, [...withUser, { role: 'assistant', text: res.answer, data: res }]);
      } catch (e2: any) {
        updateSession(sessionId!, [...withUser, { role: 'assistant', text: `Error: ${e2.message}` }]);
      } finally {
        setLoading(false);
      }
    }
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const relativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /* ──────────────────────────────────────────── */
  return (
    <div className="flex h-full">

      {/* ══════════ History overlay (mobile) ══════════ */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 sm:hidden" onClick={() => setHistoryOpen(false)} />
      )}

      {/* ══════════ History Sidebar ══════════ */}
      <div className={`
        ${historyOpen ? 'w-64 sm:w-72' : 'w-0'}
        transition-all duration-300 ease-out overflow-hidden flex-shrink-0
        bg-[#0c1017] border-r border-outline-variant/10
        ${historyOpen ? 'fixed sm:relative inset-y-0 left-0 z-30 sm:z-auto' : ''}
      `}>
        <div className="w-64 sm:w-72 h-full flex flex-col">
          <div className="px-4 py-5 border-b border-outline-variant/10 flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-[0.2em] text-outline font-black">Chat History</h3>
            <button onClick={() => setHistoryOpen(false)} className="p-1 hover:bg-surface-container rounded-lg transition-colors">
              <span className="material-symbols-outlined text-sm text-outline">close</span>
            </button>
          </div>

          <div className="px-3 py-3">
            <button 
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-container/20 border border-primary/20 rounded-xl text-xs font-bold text-primary hover:bg-primary-container/30 hover:border-primary/40 transition-all duration-300"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">
            {sessions.length === 0 ? (
              <p className="px-3 py-6 text-xs text-outline text-center italic">No conversations yet</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveId(s.id); setHistoryOpen(false); }}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group flex items-start gap-3 ${
                    s.id === activeId
                      ? 'bg-primary-container/15 border border-primary/20'
                      : 'hover:bg-surface-container border border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm text-outline mt-0.5 flex-shrink-0">chat_bubble</span>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-medium text-on-surface truncate">{s.title}</p>
                    <p className="text-[10px] text-outline mt-0.5">{s.messages.length} msgs · {relativeTime(s.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/10 rounded transition-all flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-xs text-error">delete</span>
                  </button>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ══════════ Main Chat Area ══════════ */}
      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 sm:px-6 py-3 border-b border-outline-variant/10 flex-shrink-0">
          <button onClick={() => setHistoryOpen(!historyOpen)} className="p-2 hover:bg-surface-container rounded-xl transition-all duration-200 group" title="Chat History">
            <span className="material-symbols-outlined text-lg text-outline group-hover:text-on-surface transition-colors">history</span>
          </button>
          <button onClick={startNewChat} className="p-2 hover:bg-surface-container rounded-xl transition-all duration-200 group" title="New Chat">
            <span className="material-symbols-outlined text-lg text-outline group-hover:text-on-surface transition-colors">edit_square</span>
          </button>

          {activeSession && (
            <div className="ml-2 flex items-center gap-2 animate-fade-in-up overflow-hidden">
              <span className="text-xs text-outline hidden sm:inline">·</span>
              <span className="text-xs text-on-surface-variant font-medium truncate max-w-[120px] sm:max-w-xs">{activeSession.title}</span>
            </div>
          )}

          {messages.length > 0 && (
            <button onClick={startNewChat} className="ml-auto px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-outline hover:text-on-surface hover:bg-surface-container border border-outline-variant/15 rounded-lg transition-all duration-200">
              Clear
            </button>
          )}
        </div>

        {/* ── Empty state: full-height flex column, input pinned to bottom ── */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col min-h-0 px-3 sm:px-6">
            {/* Grows to push input down */}
            <div className="flex-1 flex flex-col items-center justify-end pb-6 animate-fade-in-up">
              <div className="animate-float mb-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl text-primary/60">neurology</span>
                </div>
              </div>

              <h3 className="font-['Space_Grotesk'] text-lg sm:text-2xl font-bold text-on-surface/80 mb-1 text-center">
                What would you like to explore?
              </h3>
              <p className="text-xs sm:text-sm text-on-surface-variant mb-6 text-center max-w-md px-4">
                Ask questions about your uploaded documents. I'll find relevant information and cite my sources.
              </p>

              {/* Suggestion cards — responsive grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-w-2xl">
                {suggestions.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => handleSuggestion(s.prompt)}
                    className="text-left p-3 sm:p-4 bg-surface-container/50 border border-outline-variant/15 rounded-xl sm:rounded-2xl hover:bg-surface-container hover:border-primary/30 transition-all duration-300 hover-lift group animate-fade-in-up"
                    style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg text-primary/50 group-hover:text-primary transition-colors duration-300 mb-1 sm:mb-2 block">{s.icon}</span>
                    <p className="text-xs font-bold text-on-surface mb-0.5">{s.label}</p>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed hidden sm:block">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Input bar — inside the empty state, pinned right below suggestions */}
            <div className="flex-shrink-0 pb-3 sm:pb-4">
              <div className="max-w-3xl mx-auto">
                <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 sm:p-2 rounded-2xl flex items-end gap-2 focus-within:border-primary/30 focus-glow transition-all duration-300">
                  <textarea
                    ref={inputRef}
                    className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-outline/50 text-sm resize-none min-h-[40px] max-h-[120px] py-2.5 px-3 custom-scrollbar"
                    placeholder="Ask a question about your documents…"
                    value={input}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button
                    className="bg-primary text-on-primary-fixed p-2.5 rounded-xl transition-all duration-200 hover:shadow-[0_0_16px_rgba(181,196,255,0.4)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                  >
                    <span className="material-symbols-outlined text-lg">{loading ? 'hourglass_top' : 'arrow_upward'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-outline/40 text-center mt-2 hidden sm:block">
                  Press Enter to send · Shift+Enter for new line · Responses are grounded in your uploaded documents
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-6 min-h-0">
          <div className="max-w-3xl mx-auto space-y-5 flex flex-col min-h-full justify-end">

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${
                  msg.role === 'user' ? 'animate-slide-in-right' : 'animate-slide-in-left'
                } group/msg`}
              >
                {/* Assistant avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mr-2 sm:mr-3 mt-1 flex-shrink-0 border border-primary/10">
                    <span className="material-symbols-outlined text-xs sm:text-sm text-primary/70">neurology</span>
                  </div>
                )}

                <div className="max-w-[90%] sm:max-w-[80%] lg:max-w-[75%] relative">
                  <div
                    className={`p-3 sm:p-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
                      msg.role === 'user'
                        ? 'bg-primary/15 border-primary/20 rounded-br-md'
                        : 'bg-surface-container/60 border-outline-variant/15 rounded-tl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="text-sm leading-relaxed">{renderMarkdown(msg.text)}</div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Citations */}
                    {msg.role === 'assistant' && msg.data && msg.data.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-outline-variant/10">
                        <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.data.citations.map((cite, idx) => (
                            <div
                              key={idx}
                              className="group/cite relative cursor-pointer px-3 py-1.5 bg-primary/8 rounded-lg border border-primary/15 hover:bg-primary/15 hover:border-primary/30 transition-all duration-300"
                            >
                              <span className="text-[10px] text-primary font-medium">
                                {cite.file_name}{cite.page ? ` · p.${cite.page}` : ''}
                              </span>
                              <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-surface-container-highest rounded-xl hidden group-hover/cite:block z-50 text-xs shadow-2xl border border-outline-variant/20 animate-fade-in-down">
                                <p className="text-[10px] text-primary font-bold mb-1">{cite.file_name}{cite.page ? ` — Page ${cite.page}` : ''}</p>
                                <p className="text-on-surface-variant leading-relaxed">{cite.snippet}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => copyMessage(msg.text, i)}
                    className="absolute -bottom-2 right-2 opacity-0 group-hover/msg:opacity-100 p-1.5 bg-surface-container-highest/90 border border-outline-variant/20 rounded-lg transition-all duration-200 hover:bg-surface-container-highest"
                  >
                    <span className="material-symbols-outlined text-xs text-outline">
                      {copiedIdx === i ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-secondary/20 to-tertiary/20 flex items-center justify-center ml-2 sm:ml-3 mt-1 flex-shrink-0 border border-secondary/10">
                    <span className="material-symbols-outlined text-xs sm:text-sm text-secondary/70">person</span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start animate-slide-in-left">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mr-2 sm:mr-3 mt-1 flex-shrink-0 border border-primary/10">
                  <span className="material-symbols-outlined text-xs sm:text-sm text-primary/70">neurology</span>
                </div>
                <div className="p-4 bg-surface-container/60 rounded-2xl rounded-tl-md border border-outline-variant/15 flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce-dot animate-bounce-dot-1" />
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce-dot animate-bounce-dot-2" />
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce-dot animate-bounce-dot-3" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
          </div>

          {/* Input bar — pinned to bottom when messages exist */}
          <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t border-outline-variant/10 bg-[#10141a]/80 backdrop-blur-xl">
            <div className="max-w-3xl mx-auto">
              <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 sm:p-2 rounded-2xl flex items-end gap-2 focus-within:border-primary/30 focus-glow transition-all duration-300">
                <textarea
                  ref={inputRef}
                  className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-outline/50 text-sm resize-none min-h-[40px] max-h-[120px] py-2.5 px-3 custom-scrollbar"
                  placeholder="Ask a question about your documents…"
                  value={input}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  className="bg-primary text-on-primary-fixed p-2.5 rounded-xl transition-all duration-200 hover:shadow-[0_0_16px_rgba(181,196,255,0.4)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                >
                  <span className="material-symbols-outlined text-lg">{loading ? 'hourglass_top' : 'arrow_upward'}</span>
                </button>
              </div>
              <p className="text-[10px] text-outline/40 text-center mt-2 hidden sm:block">
                Press Enter to send · Shift+Enter for new line · Responses are grounded in your uploaded documents
              </p>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
