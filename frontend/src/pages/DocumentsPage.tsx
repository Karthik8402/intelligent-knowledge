import { useEffect, useState } from 'react';
import { deleteDocument, listDocuments } from '../api';
import type { DocumentMetadata } from '../types';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);

  const fetchDocs = async () => setDocs(await listDocuments());
  useEffect(() => { void fetchDocs(); }, []);

  const removeDoc = async (id: string) => {
    if (confirm('Are you sure you want to delete this document from the vector store?')) {
      await deleteDocument(id);
      fetchDocs();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
         <div>
           <h3 className="font-headline text-3xl font-bold tracking-tight">Knowledge Base</h3>
           <p className="text-on-surface-variant mt-2 text-sm">Manage the documents indexed in the vector store.</p>
         </div>
      </div>

      <div className="bg-surface-container/40 border border-outline-variant/15 rounded-3xl backdrop-blur-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-high text-outline text-xs uppercase font-bold tracking-widest border-b border-outline-variant/20">
            <tr>
              <th className="px-6 py-4">Filename</th>
              <th className="px-6 py-4">Pages</th>
              <th className="px-6 py-4">Chunks</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {docs.map(doc => (
              <tr key={doc.document_id} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4 font-medium text-[#b5c4ff] flex items-center gap-3">
                   <span className="material-symbols-outlined">{doc.file_name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}</span>
                   {doc.file_name}
                </td>
                <td className="px-6 py-4">{doc.pages}</td>
                <td className="px-6 py-4">{doc.chunks}</td>
                <td className="px-6 py-4">
                  <button onClick={() => removeDoc(doc.document_id)} className="text-error hover:text-red-400 p-2 rounded hover:bg-error/10 transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-outline">No documents found. Please upload via the sidebar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
