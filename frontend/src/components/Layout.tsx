import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { listDocuments, uploadDocuments } from '../api';
import type { DocumentMetadata } from '../types';

export default function Layout() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const location = useLocation();

  const fetchDocs = async () => {
    try {
      setDocuments(await listDocuments());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void fetchDocs();
  }, [location.pathname]); // Refresh on navigation

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      await uploadDocuments(Array.from(fileList));
      await fetchDocs();
    } catch (e) {
      console.error('Upload Error:', e);
    } finally {
      setUploading(false);
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-6 py-3 transition-all duration-300 ease-out active:scale-[0.99] ${
      isActive
        ? 'text-[#b5c4ff] border-l-2 border-[#b5c4ff] bg-[#1c2026] font-bold'
        : 'text-[#434654] hover:text-[#dfe2eb] hover:bg-[#1c2026]'
    }`;

  return (
    <div className="flex bg-background text-on-surface font-body overflow-hidden">
      <aside className="fixed left-0 top-0 h-screen flex flex-col z-40 w-72 border-none bg-[#0a0e14] shadow-none">
        <div className="px-6 py-8">
          <h1 className="font-['Space_Grotesk'] font-bold text-[#b5c4ff] tracking-tighter text-2xl">OBSIDIAN.AI</h1>
        </div>

        <nav className="flex-grow font-['Space_Grotesk'] text-sm tracking-tight overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <NavLink to="/documents" className={navClass}>
              <span className="material-symbols-outlined text-lg">folder_open</span>
              <span>Documents</span>
            </NavLink>
            <NavLink to="/chat" className={navClass}>
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>Knowledge Chat</span>
            </NavLink>
            <NavLink to="/chunks" className={navClass}>
              <span className="material-symbols-outlined text-lg">segment</span>
              <span>Chunks</span>
            </NavLink>
            <NavLink to="/status" className={navClass}>
              <span className="material-symbols-outlined text-lg">analytics</span>
              <span>System Status</span>
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              <span className="material-symbols-outlined text-lg">settings</span>
              <span>Settings</span>
            </NavLink>
          </div>

          <div className="mt-8 px-4">
            <label className="w-full mb-8 flex items-center justify-center gap-2 py-3 cursor-pointer bg-primary-container text-on-primary-container rounded-xl font-bold tracking-tight hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined">upload_file</span>
              <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} accept=".pdf,.txt,.docx,.md" />
              <span>{uploading ? 'Processing...' : 'Upload File'}</span>
            </label>

            <h3 className="text-[10px] uppercase tracking-[0.2em] text-outline font-black px-2 mb-4">Uploaded Documents</h3>
            <div className="space-y-4">
              {documents.length === 0 ? (
                <p className="px-2 text-xs text-outline italic">No standard knowledge base documents loaded.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.document_id} className="group">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-tertiary">
                        {doc.file_name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                      </span>
                      <div className="flex-grow overflow-hidden">
                        <p className="truncate text-on-surface text-xs font-medium" title={doc.file_name}>{doc.file_name}</p>
                        <div className="w-full bg-outline-variant/20 h-[2px] mt-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary w-full h-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-9 mt-2 space-y-2 border-l border-outline-variant/20">
                      <div className="flex items-center justify-between pl-4 pr-2 text-[10px] text-outline hover:text-on-surface transition-colors">
                        <span>Pages ({doc.pages})</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(181,196,255,0.6)]"></span>
                      </div>
                      <div className="flex items-center justify-between pl-4 pr-2 text-[10px] text-outline hover:text-on-surface transition-colors">
                        <span>Chunks ({doc.chunks})</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(181,196,255,0.6)]"></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-outline-variant/10">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container transition-all cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary-container font-black text-xs">
              AD
            </div>
            <div className="flex-grow overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate tracking-tight">Admin User</p>
              <p className="text-[10px] text-outline truncate">Local Server</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-72 min-h-screen relative overflow-x-hidden w-full bg-[#10141a]">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-container/10 rounded-full blur-[120px] -mr-96 -mt-96 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary-container/10 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none"></div>

        <header className="flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 bg-[#10141a]/80 backdrop-blur-md border-b border-[#434654]/15 shadow-[0_40px_60px_-15px_rgba(181,196,255,0.08)]">
          <div className="flex items-center gap-4">
            <h2 className="font-['Space_Grotesk'] font-medium text-lg text-[#b5c4ff]">
              {location.pathname === '/documents' ? 'Document Manager' : 
               location.pathname === '/chat' ? 'Knowledge Chat' :
               location.pathname === '/chunks' ? 'Vector Shards' :
               location.pathname === '/status' ? 'System Telemetry' :
               location.pathname === '/settings' ? 'Engine Settings' : 'Control Panel'}
            </h2>
          </div>
        </header>

        <section className="relative z-10 max-w-5xl mx-auto p-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
