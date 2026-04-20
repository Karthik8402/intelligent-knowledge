import { useEffect, useState } from 'react';
import { listDocuments, getDocumentChunks } from '../api';
import type { DocumentMetadata, RawChunk } from '../types';

export default function ChunksPage() {
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<RawChunk[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void listDocuments().then(setDocs);
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      setLoading(true);
      getDocumentChunks(selectedDocId)
        .then(res => setChunks(res.chunks))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setChunks([]);
    }
  }, [selectedDocId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container/40 border border-outline-variant/15 p-8 rounded-3xl backdrop-blur-xl">
        <h3 className="font-headline text-3xl font-bold tracking-tight mb-2">Neural Chunks</h3>
        <p className="text-on-surface-variant text-sm">Visualize how the text splitter isolated specific embeddings from the documents.</p>
        
        <div className="mt-6 flex gap-4">
           <select 
             className="bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 ring-primary/50"
             value={selectedDocId || ''} 
             onChange={e => setSelectedDocId(e.target.value)}
           >
             <option value="" disabled>Select a Document...</option>
             {docs.map(d => <option key={d.document_id} value={d.document_id}>{d.file_name} ({d.chunks} chunks)</option>)}
           </select>
        </div>
      </div>

      {loading && <div className="p-8 text-center text-primary animate-pulse">Retrieving vector shards...</div>}

      {!loading && chunks.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {chunks.map((ck, i) => (
             <div key={i} className="bg-surface-container-low border border-outline-variant/15 p-6 rounded-2xl flex flex-col gap-3 group hover:border-primary/40 transition-colors">
               <div className="flex justify-between items-center text-xs text-outline font-bold tracking-widest uppercase">
                 <span>Chunk #{i + 1}</span>
                 {ck.page && <span className="bg-primary/20 text-primary px-2 py-1 rounded">Page {ck.page}</span>}
               </div>
               <p className="text-sm font-body leading-relaxed text-on-surface-variant">{ck.text}</p>
             </div>
           ))}
         </div>
      )}

      {!loading && selectedDocId && chunks.length === 0 && (
        <div className="p-8 text-center text-outline italic bg-surface-container-low rounded-2xl border border-outline-variant/10">
          No chunk payloads were found for this document in memory.
        </div>
      )}
    </div>
  );
}
