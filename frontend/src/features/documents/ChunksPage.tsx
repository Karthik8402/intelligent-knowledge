import { useEffect, useState } from 'react';
import { listDocuments, getDocumentChunks } from '../../api';
import type { DocumentMetadata, RawChunk } from '../../types';
import { CardSkeleton } from '../../shared/Skeleton';

export default function ChunksPage() {
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentMetadata | null>(null);
  const [chunks, setChunks] = useState<RawChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void listDocuments().then(setDocs).catch(console.error);
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

  const filteredDocs = docs.filter(d =>
    d.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const fileIcon = (name: string) =>
    name.endsWith('.pdf') ? 'picture_as_pdf' :
    name.endsWith('.md') ? 'markdown' :
    name.endsWith('.docx') ? 'article' : 'description';

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-h-0">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h3 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight mb-1">Neural Chunks</h3>
        <p className="text-on-surface-variant text-sm">
          Visualize how the text splitter isolated specific embeddings from your documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-h-0">
        {/* Documents list */}
        <aside className="lg:col-span-4 bg-surface-container/40 border border-outline-variant/15 p-4 sm:p-5 rounded-2xl backdrop-blur-xl flex flex-col min-h-[240px]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-outline font-black flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary/60">folder_open</span>
              Documents
            </p>
            {selectedDoc && (
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-[10px] uppercase tracking-widest text-outline hover:text-on-surface transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-surface-container/50 rounded-xl border border-outline-variant/10 mb-3">
            <span className="material-symbols-outlined text-sm text-outline">search</span>
            <input
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

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 min-h-0">
            {filteredDocs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <span className="material-symbols-outlined text-2xl text-outline/30 mb-2 block">search_off</span>
                <p className="text-xs text-outline italic">No documents match "{search}"</p>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <button
                  key={doc.document_id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left group border ${
                    selectedDoc?.document_id === doc.document_id
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-surface-container/30 border-transparent hover:bg-surface-container'
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
                    </div>
                  </div>
                </button>
              ))
            )}

            {docs.length === 0 && (
              <div className="px-4 py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-outline/20 mb-2 block animate-float">folder_off</span>
                <p className="text-xs text-outline">No documents uploaded yet.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Chunks panel */}
        <section className="lg:col-span-8 flex flex-col gap-4 min-h-0">
          {selectedDoc && !loading && chunks.length > 0 && (
            <div className="flex flex-wrap gap-3 animate-fade-in-up">
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

                  <div className="h-px bg-outline-variant/10 group-hover:bg-primary/10 transition-colors" />

                  <p className="text-sm font-body leading-relaxed text-on-surface-variant line-clamp-6 group-hover:text-on-surface transition-colors duration-300 flex-1">
                    {ck.text}
                  </p>

                  <p className="text-[10px] text-outline/50 text-right">
                    ~{ck.text.split(' ').length} words
                  </p>
                </div>
              ))}
            </div>
          )}

          {!loading && selectedDoc && chunks.length === 0 && (
            <div className="p-8 sm:p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/10 animate-fade-in-up">
              <span className="material-symbols-outlined text-4xl text-outline/30 mb-3 block animate-float">data_array</span>
              <p className="text-outline italic text-sm">No chunk payloads found for this document in memory.</p>
            </div>
          )}

          {!loading && !selectedDoc && docs.length > 0 && (
            <div className="p-8 sm:p-10 text-center animate-fade-in-up border border-dashed border-outline-variant/20 rounded-2xl" style={{ animationDelay: '0.15s' }}>
              <span className="material-symbols-outlined text-4xl sm:text-5xl text-outline/20 mb-3 block animate-float">hub</span>
              <p className="text-outline text-sm mb-1">Select a document to inspect its vector chunks.</p>
              <p className="text-[11px] text-outline/50">{docs.length} document{docs.length !== 1 ? 's' : ''} available</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
