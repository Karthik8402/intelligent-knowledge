import { useState } from 'react';

type FAQItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is RAG and how does Quick Knowledge use it?',
    answer: 'RAG (Retrieval-Augmented Generation) is a technique that combines document retrieval with AI generation. Quick Knowledge splits your uploaded documents into chunks, creates vector embeddings, and retrieves the most relevant chunks to provide accurate, grounded answers to your questions.',
  },
  {
    question: 'What document formats are supported?',
    answer: 'Quick Knowledge supports PDF, DOCX, TXT, and Markdown (.md) files. Documents are automatically parsed, split into chunks, and indexed in the vector store for retrieval.',
  },
  {
    question: 'How do I upload documents?',
    answer: 'Navigate to the Documents page from the sidebar, then drag and drop your files or click the upload button. Files are processed, chunked, and indexed automatically. The maximum file size is 25MB per document.',
  },
  {
    question: 'How does the chat feature work?',
    answer: 'The Knowledge Chat uses your indexed documents as context. When you ask a question, the system retrieves relevant chunks from your documents and uses them to generate an accurate response. You can optionally filter by specific documents.',
  },
  {
    question: 'What are chunks and embeddings?',
    answer: 'Chunks are small segments of your documents (typically 500-1000 tokens). Embeddings are mathematical vector representations of these chunks that enable semantic search. The vector store indexes these embeddings for fast, relevant retrieval.',
  },
  {
    question: 'How do I change the AI model or vector store?',
    answer: 'Go to Settings from the sidebar to change the LLM provider, model, embedding model, and vector store. Changes apply in memory and reset on server restart. For permanent changes, update your backend .env file.',
  },
];

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Ctrl', 'K'], description: 'Focus chat input' },
  { keys: ['Ctrl', '/'], description: 'Open keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal / cancel action' },
  { keys: ['Enter'], description: 'Send message in chat' },
  { keys: ['Shift', 'Enter'], description: 'New line in chat input' },
];

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(prev => (prev === index ? null : index));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-outline font-black">Resources</p>
        <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Help & Support</h3>
        <p className="text-on-surface-variant text-sm mt-1">Find answers, shortcuts, and resources to get the most out of Quick Knowledge.</p>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <h4 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary/60">quiz</span>
          Frequently Asked Questions
        </h4>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="border border-outline-variant/10 rounded-xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFAQ(i)}
                className="flex items-center justify-between w-full p-4 text-left hover:bg-surface-container-highest/30 transition-colors"
              >
                <span className="text-sm font-medium text-on-surface pr-4">{item.question}</span>
                <span className={`material-symbols-outlined text-lg text-outline flex-shrink-0 transition-transform duration-300 ${openFAQ === i ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-out-expo ${
                  openFAQ === i ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 text-xs text-on-surface-variant leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <h4 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary/60">keyboard</span>
          Keyboard Shortcuts
        </h4>
        <div className="space-y-3">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0">
              <span className="text-sm text-on-surface-variant">{shortcut.description}</span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, ki) => (
                  <span key={ki}>
                    <kbd className="px-2 py-1 rounded-lg bg-surface-container-highest/60 border border-outline-variant/20 text-[11px] font-mono text-on-surface font-medium shadow-sm">
                      {key}
                    </kbd>
                    {ki < shortcut.keys.length - 1 && <span className="text-outline mx-1 text-[10px]">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <a
          href="https://github.com/Karthik8402/intelligent-knowledge"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-surface-container/40 border border-outline-variant/15 p-5 rounded-2xl hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">code</span>
            <h4 className="font-bold text-on-surface">GitHub Repository</h4>
          </div>
          <p className="text-xs text-on-surface-variant">View source code, report issues, and contribute to the project.</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-primary">
            <span>View on GitHub</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </div>
        </a>
        <div className="bg-surface-container/40 border border-outline-variant/15 p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-secondary text-2xl">menu_book</span>
            <h4 className="font-bold text-on-surface">API Documentation</h4>
          </div>
          <p className="text-xs text-on-surface-variant">REST API reference for backend integration and automation.</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-outline">
            <span>Available at /docs endpoint</span>
          </div>
        </div>
      </div>

      {/* Support Contact */}
      <div className="bg-surface-container-low border border-outline-variant/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary/60 text-lg mt-0.5 flex-shrink-0">support_agent</span>
          <div className="text-xs text-on-surface-variant leading-relaxed space-y-1">
            <p><strong className="text-on-surface">Need more help?</strong> Open an issue on the GitHub repository or check the README for detailed setup instructions.</p>
            <p>For bug reports, include your browser version, backend logs, and steps to reproduce the issue.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
