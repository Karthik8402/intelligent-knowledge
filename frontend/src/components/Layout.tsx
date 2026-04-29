import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { listDocuments } from '../api';
import type { DocumentMetadata } from '../types';
import ToastContainer from './Toast';

export default function Layout() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [pageKey, setPageKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const fetchDocs = async () => {
    try {
      setDocuments(await listDocuments());
    } catch (e) {
      console.error(e);
    }
  };

  /* ── Scroll main to top + close mobile sidebar on route change ── */
  useEffect(() => {
    void fetchDocs();
    setPageKey((k) => k + 1);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setSidebarOpen(false);
  }, [location.pathname]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-6 py-3 transition-all duration-300 ease-out-expo relative overflow-hidden group ${
      isActive
        ? 'text-[#b5c4ff] border-l-2 border-[#b5c4ff] bg-[#1c2026] font-bold'
        : 'text-[#434654] hover:text-[#dfe2eb] hover:bg-[#1c2026]'
    }`;

  const navItems = [
    { to: '/documents', icon: 'folder_open', label: 'Documents' },
    { to: '/chat', icon: 'chat', label: 'Knowledge Chat' },
    { to: '/chunks', icon: 'segment', label: 'Chunks' },
    { to: '/status', icon: 'analytics', label: 'System Status' },
    { to: '/settings', icon: 'settings', label: 'Settings' },
  ];

  const isChat = location.pathname === '/chat';

  return (
    <div className="flex h-screen bg-background text-on-surface font-body overflow-hidden">
      <ToastContainer />

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fade-in-up"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed left-0 top-0 h-screen flex flex-col z-40 w-72 border-none bg-[#0a0e14] shadow-none
        transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="font-['Space_Grotesk'] font-bold text-[#b5c4ff] tracking-tighter text-2xl animate-fade-in-down">
              OBSIDIAN.AI
            </h1>
            <div className="h-[2px] w-12 bg-gradient-to-r from-primary to-secondary mt-2 rounded-full" />
          </div>
          {/* Close button — mobile only */}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-surface-container rounded-xl transition-colors">
            <span className="material-symbols-outlined text-outline">close</span>
          </button>
        </div>

        <nav className="flex-grow font-['Space_Grotesk'] text-sm tracking-tight overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {navItems.map((item, i) => (
              <NavLink key={item.to} to={item.to} className={navClass} style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="material-symbols-outlined text-lg transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-primary rounded-full transition-all duration-300 group-hover:h-6" />
              </NavLink>
            ))}
          </div>

          {/* Quick stats */}
          <div className="mt-8 px-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-outline font-black mb-3">Quick Stats</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm text-primary/50">description</span>
                  Documents
                </span>
                <span className="text-on-surface font-bold">{documents.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm text-tertiary/50">segment</span>
                  Total Chunks
                </span>
                <span className="text-on-surface font-bold">{documents.reduce((s, d) => s + d.chunks, 0)}</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-outline-variant/10">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container transition-all duration-300 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary-container font-black text-xs transition-transform duration-300 group-hover:scale-110 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>
              AD
            </div>
            <div className="flex-grow overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate tracking-tight">Admin User</p>
              <p className="text-[10px] text-outline truncate">Local Server</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main
        ref={mainRef}
        className={`
          flex-1 h-screen overflow-x-hidden relative w-full bg-[#10141a] custom-scrollbar
          ml-0 lg:ml-72
          ${isChat ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}
        `}
      >
        {/* Animated background orbs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-container/10 rounded-full blur-[120px] -mr-96 -mt-96 pointer-events-none animate-float" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary-container/10 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

        <header className="flex justify-between items-center w-full px-4 sm:px-6 py-4 sticky top-0 z-50 bg-[#10141a]/80 backdrop-blur-md border-b border-[#434654]/15 shadow-[0_40px_60px_-15px_rgba(181,196,255,0.08)] flex-shrink-0">
          <div className="flex items-center gap-3 animate-fade-in-down">
            {/* Hamburger — mobile only */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-surface-container rounded-xl transition-colors">
              <span className="material-symbols-outlined text-outline">menu</span>
            </button>
            <h2 className="font-['Space_Grotesk'] font-medium text-base sm:text-lg text-[#b5c4ff]">
              {location.pathname === '/documents' ? 'Document Manager' : 
               location.pathname === '/chat' ? 'Knowledge Chat' :
               location.pathname === '/chunks' ? 'Vector Shards' :
               location.pathname === '/status' ? 'System Telemetry' :
               location.pathname === '/settings' ? 'Engine Settings' : 'Control Panel'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${documents.length > 0 ? 'bg-[#2dd36f] animate-pulse-glow' : 'bg-outline'}`} style={{ boxShadow: documents.length > 0 ? '0 0 8px rgba(45, 211, 111, 0.5)' : 'none' }} />
            <span className="text-[10px] text-outline uppercase tracking-widest font-bold hidden sm:inline">
              {documents.length > 0 ? `${documents.length} docs active` : 'no docs'}
            </span>
          </div>
        </header>

        {/* Chat route gets flex-1 to fill remaining space; other routes scroll normally */}
        {isChat ? (
          <div key={pageKey} className="relative z-10 flex-1 min-h-0 animate-fade-in-up">
            <Outlet />
          </div>
        ) : (
          <section key={pageKey} className="relative z-10 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in-up">
            <Outlet />
          </section>
        )}
      </main>
    </div>
  );
}
