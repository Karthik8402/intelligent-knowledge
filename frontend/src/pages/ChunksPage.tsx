import { useEffect, useRef, useState } from 'react';
import { listDocuments, getDocumentChunks } from '../api';
import type { DocumentMetadata, RawChunk } from '../types';
import { CardSkeleton } from '../components/Skeleton';

export default function ChunksPage() {
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentMetadata | null>(null);
  const [chunks, setChunks] = useState<RawChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listDocuments().then(setDocs);
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      setLoading(true);
      getDocumentChunks(selectedDoc.document_id)
        .then(res => setChunks(res.chunks))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setChunks([]);
    }
  }, [selectedDoc]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredDocs = docs.filter(d =>
    d.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const fileIcon = (name: string) =>
    name.endsWith('.pdf') ? 'picture_as_pdf' :
    name.endsWith('.md') ? 'markdown' :
    name.endsWith('.docx') ? 'article' : 'description';

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight mb-1">Neural Chunks</h3>
        <p className="text-on-surface-variant text-sm">
          Visualize how the text splitter isolated specific embeddings from your documents.
        </p>
      </div>

      {/* Document selector card */}
      <div className="bg-surface-container/40 border border-outline-variant/15 p-5 sm:p-6 rounded-2xl backdrop-blur-xl animate-scale-in" style={{ animationDelay: '0.05s' }}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-outline font-black mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary/60">folder_open</span>
          Select Document
        </p>

        {/* Custom dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => { setDropdownOpen(v => !v); setSearch(''); }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 text-left
              bg-surface-container-highest/60 backdrop-blur-xl
              ${dropdownOpen
                ? 'border-primary/50 shadow-[0_0_0_3px_rgba(181,196,255,0.1)]'
                : 'border-outline-variant/20 hover:border-outline-variant/40'
              }
            `}
          >
            {selectedDoc ? (
              <>
                <span className="material-symbols-outlined text-primary/70 text-lg flex-shrink-0">{fileIcon(selectedDoc.file_name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{selectedDoc.file_name}</p>
                  <p className="text-[10px] text-outline mt-0.5">{selectedDoc.chunks} chunks · {selectedDoc.pages} pages · {selectedDoc.source_type.toUpperCase()}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedDoc(null); setDropdownOpen(false); }}
                  className="p-1 hover:bg-surface-container rounded-lg transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-sm text-outline">close</span>
                </button>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-outline/50 text-lg flex-shrink-0">search</span>
                <span className="text-sm text-outline/60 flex-1">Select a document to inspect…</span>
                <span className={`material-symbols-outlined text-outline transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </>
            )}
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-highest border border-outline-variant/20 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-down">
              {/* Search inside dropdown */}
              {docs.length > 3 && (
                <div className="p-2 border-b border-outline-variant/10">
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-container/50 rounded-xl">
                    <span className="material-symbols-outlined text-sm text-outline">search</span>
                    <input
                      autoFocus
                      className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline/50 focus:outline-none"
                      placeholder="Search documents…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="text-outline hover:text-on-surface transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {filteredDocs.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <span className="material-symbols-outlined text-2xl text-outline/30 mb-2 block">search_off</span>
                    <p className="text-xs text-outline italic">No documents match "{search}"</p>
                  </div>
                ) : (
                  filteredDocs.map((doc, i) => (
                    <button
                      key={doc.document_id}
                      onClick={() => { setSelectedDoc(doc); setDropdownOpen(false); setSearch(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/8 transition-all duration-200 text-left group border-b border-outline-variant/5 last:border-0 ${
                        selectedDoc?.document_id === doc.document_id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-base text-primary/60 group-hover:text-primary transition-colors">{fileIcon(doc.file_name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-outline">{doc.chunks} chunks</span>
                          <span className="text-[10px] text-outline/40">·</span>
                          <span className="text-[10px] text-outline">{doc.pages} pages</span>
                          <span className="text-[10px] text-outline/40">·</span>
                          <span className="text-[10px] text-primary/60 font-bold uppercase">{doc.source_type}</span>
                        </div>
                      </div>
                      {selectedDoc?.document_id === doc.document_id && (
                        <span className="material-symbols-outlined text-sm text-primary flex-shrink-0">check_circle</span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {docs.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-outline/20 mb-2 block animate-float">folder_off</span>
                  <p className="text-xs text-outline">No documents uploaded yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats bar when doc is selected */}
        {selectedDoc && !loading && chunks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 animate-fade-in-up">
            {[
              { icon: 'segment',      label: 'Chunks',  value: chunks.length,       color: 'text-primary' },
              { icon: 'description',  label: 'Pages',   value: selectedDoc.pages,   color: 'text-tertiary' },
              { icon: 'data_object',  label: 'Type',    value: selectedDoc.source_type.toUpperCase(), color: 'text-secondary' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 px-3 py-2 bg-surface-container/50 border border-outline-variant/10 rounded-xl">
                <span className={`material-symbols-outlined text-sm ${stat.color}`}>{stat.icon}</span>
                <span className={`text-xs font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-[10px] text-outline">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <CardSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Chunk cards */}
      {!loading && chunks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {chunks.map((ck, i) => (
            <div
              key={i}
              className="bg-surface-container-low border border-outline-variant/15 p-4 sm:p-5 rounded-xl sm:rounded-2xl flex flex-col gap-3 group hover:border-primary/40 hover-lift transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Chunk header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span className="text-[10px] font-black text-primary">{i + 1}</span>
                  </div>
                  <span className="text-[10px] text-outline font-bold tracking-widest uppercase">Chunk</span>
                </div>
                {ck.page && (
                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/15 group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-xs">auto_stories</span>
                    <span className="text-[10px] font-bold">Page {ck.page}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-outline-variant/10 group-hover:bg-primary/10 transition-colors" />

              {/* Chunk text */}
              <p className="text-sm font-body leading-relaxed text-on-surface-variant line-clamp-6 group-hover:text-on-surface transition-colors duration-300 flex-1">
                {ck.text}
              </p>

              {/* Word count */}
              <p className="text-[10px] text-outline/50 text-right">
                ~{ck.text.split(' ').length} words
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty selection state */}
      {!loading && selectedDoc && chunks.length === 0 && (
        <div className="p-8 sm:p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/10 animate-fade-in-up">
          <span className="material-symbols-outlined text-4xl text-outline/30 mb-3 block animate-float">data_array</span>
          <p className="text-outline italic text-sm">No chunk payloads found for this document in memory.</p>
        </div>
      )}

      {/* No selection hint */}
      {!loading && !selectedDoc && docs.length > 0 && (
        <div className="p-8 sm:p-10 text-center animate-fade-in-up border border-dashed border-outline-variant/20 rounded-2xl" style={{ animationDelay: '0.15s' }}>
          <span className="material-symbols-outlined text-4xl sm:text-5xl text-outline/20 mb-3 block animate-float">hub</span>
          <p className="text-outline text-sm mb-1">Select a document above to inspect its vector chunks.</p>
          <p className="text-[11px] text-outline/50">{docs.length} document{docs.length !== 1 ? 's' : ''} available</p>
        </div>
      )}
    </div>
  );
}
