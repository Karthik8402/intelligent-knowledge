import type { ChatResponse, ChunksResponse, DocumentMetadata, Settings, SystemStatus, UploadResult } from './types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export async function uploadDocuments(files: File[]): Promise<UploadResult[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Upload failed');
  }

  return response.json() as Promise<UploadResult[]>;
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  const response = await fetch(`${API_BASE_URL}/documents`);
  if (!response.ok) {
    throw new Error('Failed to list documents');
  }
  const data = await response.json();
  return data.documents;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
}

export async function chat(question: string, documentIds?: string[]): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, document_ids: documentIds?.length ? documentIds : null }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json() as Promise<ChatResponse>;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE_URL}/status`);
  if (!response.ok) throw new Error('Failed to get status');
  return response.json();
}

export async function getDocumentChunks(documentId: string): Promise<ChunksResponse> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/chunks`);
  if (!response.ok) throw new Error('Failed to get chunks');
  return response.json();
}

export async function getSettings(): Promise<Settings> {
  const response = await fetch(`${API_BASE_URL}/settings`);
  if (!response.ok) throw new Error('Failed to get settings');
  return response.json();
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  const result = await response.json();
  return result.settings;
}
