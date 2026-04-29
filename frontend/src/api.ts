import type { ChatResponse, ChunksResponse, Citation, DocumentMetadata, Settings, SystemStatus, UploadResult } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
    throw new Error(errorData?.detail || errorData?.error || 'Upload failed');
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
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment.');
    throw new Error('Failed to send message');
  }

  return response.json() as Promise<ChatResponse>;
}

/**
 * SSE streaming chat — yields tokens in real-time and returns citations at the end.
 */
export async function chatStream(
  question: string,
  onToken: (token: string) => void,
  onCitations: (citations: Citation[]) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      onError('Rate limit exceeded. Please wait a moment.');
      return;
    }
    onError('Failed to connect to chat stream');
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('Streaming not supported');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const data = line.slice(5).trim();

        switch (currentEvent) {
          case 'token':
            onToken(data);
            break;
          case 'citations':
            try {
              const citations = JSON.parse(data) as Citation[];
              onCitations(citations);
            } catch { /* ignore parse errors */ }
            break;
          case 'done':
            onDone();
            break;
          case 'error':
            onError(data);
            break;
        }
        currentEvent = '';
      }
    }
  }
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

export async function getHealth(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error('Failed to get health status');
  return response.json();
}
