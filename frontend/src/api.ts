import type { ChatResponse, DocumentMetadata, UploadResult } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function uploadDocuments(files: File[]): Promise<UploadResult[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData
  });

  return parseResponse<UploadResult[]>(response);
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  const response = await fetch(`${API_BASE}/documents`);
  const data = await parseResponse<{ documents: DocumentMetadata[] }>(response);
  return data.documents;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to delete document');
  }
}

export async function chat(question: string, documentIds: string[]): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question,
      document_ids: documentIds.length ? documentIds : null
    })
  });

  return parseResponse<ChatResponse>(response);
}
