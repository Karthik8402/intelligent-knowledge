import { useEffect, useMemo, useState } from 'react';

import { chat, deleteDocument, listDocuments, uploadDocuments } from './api';
import type { ChatResponse, DocumentMetadata, UploadResult } from './types';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  response?: ChatResponse;
};

function App() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDocuments = documents.length > 0;

  async function refreshDocuments() {
    setLoadingDocuments(true);
    setError(null);
    try {
      const data = await listDocuments();
      setDocuments(data);
      setSelectedDocumentIds((current) => current.filter((id) => data.some((doc) => doc.document_id === id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoadingDocuments(false);
    }
  }

  useEffect(() => {
    void refreshDocuments();
  }, []);

  const selectedSet = useMemo(() => new Set(selectedDocumentIds), [selectedDocumentIds]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResults([]);

    try {
      const results = await uploadDocuments(Array.from(fileList));
      setUploadResults(results);
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setError(null);
    try {
      await deleteDocument(documentId);
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function toggleSelection(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  }

  async function askQuestion() {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    setAsking(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);

    try {
      const response = await chat(trimmed, selectedDocumentIds);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.answer,
          response
        }
      ]);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Intelligent Knowledge Base</h1>
        <p>Upload documents, ask precise questions, and get grounded answers with citations.</p>
      </header>

      <div className="layout-grid">
        <aside className="panel">
          <h2>Documents</h2>

          <label className="upload-box" htmlFor="file-input">
            <input
              id="file-input"
              type="file"
              accept=".pdf,.txt,.docx,.md"
              multiple
              onChange={(event) => void handleUpload(event.target.files)}
            />
            <span>{uploading ? 'Uploading and indexing...' : 'Select PDF, TXT, DOCX, or MD files'}</span>
          </label>

          {uploadResults.length > 0 && (
            <ul className="status-list">
              {uploadResults.map((result) => (
                <li key={`${result.file_name}-${result.status}`}> 
                  <strong>{result.file_name}</strong>: {result.status}
                  {result.error ? ` (${result.error})` : ''}
                </li>
              ))}
            </ul>
          )}

          {loadingDocuments ? (
            <p>Loading indexed documents...</p>
          ) : !hasDocuments ? (
            <p className="empty">No indexed documents yet.</p>
          ) : (
            <ul className="doc-list">
              {documents.map((doc) => (
                <li key={doc.document_id} className="doc-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(doc.document_id)}
                      onChange={() => toggleSelection(doc.document_id)}
                    />
                    <span>{doc.file_name}</span>
                  </label>
                  <small>
                    {doc.pages} pages | {doc.chunks} chunks
                  </small>
                  <button onClick={() => void handleDelete(doc.document_id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="panel chat-panel">
          <h2>Chat</h2>
          <div className="chat-log">
            {messages.length === 0 && <p className="empty">Ask a question about your uploaded documents.</p>}
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
                <p>{message.text}</p>
                {message.role === 'assistant' && message.response && (
                  <div className="sources">
                    <h3>Citations</h3>
                    {message.response.citations.length === 0 ? (
                      <p>No validated citations.</p>
                    ) : (
                      <ul>
                        {message.response.citations.map((citation, citationIndex) => (
                          <li key={`${citation.document_id}-${citationIndex}`}>
                            {citation.file_name}
                            {citation.page ? `, page ${citation.page}` : ''}: {citation.snippet}
                          </li>
                        ))}
                      </ul>
                    )}

                    <details>
                      <summary>Retrieved chunks</summary>
                      <ul>
                        {message.response.retrieved_chunks.map((chunk, chunkIndex) => (
                          <li key={`${chunk.document_id}-${chunkIndex}`}>
                            <strong>{chunk.file_name}</strong>
                            {chunk.page ? `, page ${chunk.page}` : ''}
                            {chunk.score !== null ? `, score ${chunk.score}` : ''}
                            <p>{chunk.text}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="composer">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question, for example: What is the warranty policy for the X1 model?"
              rows={3}
            />
            <button onClick={() => void askQuestion()} disabled={asking || !hasDocuments}>
              {asking ? 'Thinking...' : 'Ask'}
            </button>
          </div>

          {!hasDocuments && <p className="hint">Upload and index documents before asking questions.</p>}
          {error && <p className="error">{error}</p>}
        </main>
      </div>
    </div>
  );
}

export default App;
