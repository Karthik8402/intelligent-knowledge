/**
 * Unit tests for the API module — mocks fetch to test all HTTP client functions
 * without any real network calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { getAccessTokenMock } = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn().mockResolvedValue(null),
}));

// ── Mock supabase token helper ──────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  getAccessToken: getAccessTokenMock,
}));

// ── Helper to create a mock Response ───────────────────────────────────────
function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Import API functions after mocks are set up ────────────────────────────
import {
  clearApiCache,
  listDocuments,
  deleteDocument,
  chat,
  getSystemStatus,
  getDocumentChunks,
  getSettings,
  updateSettings,
  getHealth,
} from '../api';

describe('API Module', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    clearApiCache();
    getAccessTokenMock.mockReset();
    getAccessTokenMock.mockResolvedValue(null);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ── getHealth ──────────────────────────────────────────────────────────
  describe('getHealth()', () => {
    it('fetches /health and returns data', async () => {
      fetchMock.mockResolvedValue(mockResponse({ status: 'healthy', version: '3.0.0' }));
      const result = await getHealth();
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('3.0.0');
    });

    it('throws when server returns non-ok status', async () => {
      fetchMock.mockResolvedValue(mockResponse({ detail: 'Server Error' }, 500));
      await expect(getHealth()).rejects.toThrow('Failed to get health status');
    });
  });

  // ── listDocuments ──────────────────────────────────────────────────────
  describe('listDocuments()', () => {
    it('returns array of documents', async () => {
      const mockDocs = [
        { document_id: 'abc', file_name: 'test.pdf', source_type: 'pdf', pages: 5, chunks: 10, content_hash: 'h1', created_at: '2026-01-01' },
      ];
      fetchMock.mockResolvedValue(mockResponse({ documents: mockDocs }));
      const docs = await listDocuments();
      expect(docs).toHaveLength(1);
      expect(docs[0].document_id).toBe('abc');
    });

    it('returns empty array when no documents', async () => {
      fetchMock.mockResolvedValue(mockResponse({ documents: [] }));
      const docs = await listDocuments();
      expect(docs).toEqual([]);
    });

    it('deduplicates concurrent document list requests', async () => {
      fetchMock.mockResolvedValue(mockResponse({ documents: [] }));

      const [first, second] = await Promise.all([listDocuments(), listDocuments()]);

      expect(first).toEqual([]);
      expect(second).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws on fetch failure', async () => {
      fetchMock.mockResolvedValue(mockResponse({ error: 'fail' }, 500));
      await expect(listDocuments()).rejects.toThrow('Failed to list documents');
    });
  });

  // ── deleteDocument ─────────────────────────────────────────────────────
  describe('deleteDocument()', () => {
    it('resolves without error on 200', async () => {
      fetchMock.mockResolvedValue(mockResponse({ deleted: true }));
      await expect(deleteDocument('doc-123')).resolves.toBeUndefined();
    });

    it('throws on 404', async () => {
      fetchMock.mockResolvedValue(mockResponse({ error: 'not found' }, 404));
      await expect(deleteDocument('ghost-doc')).rejects.toThrow('Failed to delete document');
    });
  });

  // ── chat ───────────────────────────────────────────────────────────────
  describe('chat()', () => {
    it('posts a question and returns response', async () => {
      const mockResp = {
        answer: 'AI is cool.',
        citations: [],
        retrieved_chunks: [],
      };
      fetchMock.mockResolvedValue(mockResponse(mockResp));
      const result = await chat('What is AI?');
      expect(result.answer).toBe('AI is cool.');
      expect(result.citations).toEqual([]);
    });

    it('throws rate limit error on 429', async () => {
      fetchMock.mockResolvedValue(mockResponse({ error: 'rate limited' }, 429));
      await expect(chat('question')).rejects.toThrow('Rate limit exceeded');
    });

    it('throws generic error on other failures', async () => {
      fetchMock.mockResolvedValue(mockResponse({ error: 'fail' }, 500));
      await expect(chat('question')).rejects.toThrow('Failed to send message');
    });
  });

  // ── getSystemStatus ────────────────────────────────────────────────────
  describe('getSystemStatus()', () => {
    it('returns system status object', async () => {
      const status = {
        vector_store: 'pgvector',
        llm_provider: 'google',
        store_initialized: true,
        embeddings_loaded: true,
        documents: 5,
        chunks: 42,
      };
      fetchMock.mockResolvedValue(mockResponse(status));
      const result = await getSystemStatus();
      expect(result.vector_store).toBe('pgvector');
      expect(result.documents).toBe(5);
    });

    it('throws on failure', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, 503));
      await expect(getSystemStatus()).rejects.toThrow('Failed to get status');
    });
  });

  // ── getDocumentChunks ──────────────────────────────────────────────────
  describe('getDocumentChunks()', () => {
    it('returns chunks for a document', async () => {
      const chunksResp = {
        document_id: 'doc-001',
        chunks: [{ text: 'chunk content', page: 1 }],
      };
      fetchMock.mockResolvedValue(mockResponse(chunksResp));
      const result = await getDocumentChunks('doc-001');
      expect(result.document_id).toBe('doc-001');
      expect(result.chunks).toHaveLength(1);
    });

    it('throws on failure', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, 500));
      await expect(getDocumentChunks('bad-id')).rejects.toThrow('Failed to get chunks');
    });
  });

  // ── getSettings ────────────────────────────────────────────────────────
  describe('getSettings()', () => {
    it('returns settings object', async () => {
      const settings = {
        rag_top_k: 5,
        rag_chunk_size: 1000,
        rag_chunk_overlap: 200,
        llm_provider: 'google',
        llm_model: 'gemini-2.5-flash-lite',
        llm_temperature: 0.2,
        llm_top_p: 1,
        embedding_model: 'gemini-embedding-001',
        vector_store: 'pgvector',
        max_upload_size_mb: 25,
      };
      fetchMock.mockResolvedValue(mockResponse(settings));
      const result = await getSettings();
      expect(result.rag_top_k).toBe(5);
      expect(result.llm_provider).toBe('google');
    });
  });

  // ── updateSettings ─────────────────────────────────────────────────────
  describe('updateSettings()', () => {
    it('sends PUT and returns updated settings', async () => {
      const newSettings = {
        rag_top_k: 10,
        rag_chunk_size: 900,
        rag_chunk_overlap: 150,
        llm_provider: 'openai',
        llm_model: 'gpt-4o-mini',
        llm_temperature: 0.3,
        llm_top_p: 0.9,
        embedding_model: 'text-embedding-3-small',
        vector_store: 'chroma',
        max_upload_size_mb: 20,
      };
      fetchMock.mockResolvedValue(mockResponse({ status: 'updated', settings: newSettings }));
      const result = await updateSettings(newSettings);
      expect(result.rag_top_k).toBe(10);
      expect(result.llm_provider).toBe('openai');
    });

    it('throws on failure', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, 500));
      await expect(updateSettings({
        rag_top_k: 1,
        rag_chunk_size: 1000,
        rag_chunk_overlap: 200,
        llm_provider: 'x',
        llm_model: 'unknown',
        llm_temperature: 0.2,
        llm_top_p: 1,
        embedding_model: 'unknown',
        vector_store: 'y',
        max_upload_size_mb: 25,
      }))
        .rejects.toThrow('Failed to update settings');
    });
  });

  // ── Auth header behavior ───────────────────────────────────────────────
  describe('Auth headers', () => {
    it('does not add Authorization header when no token', async () => {
      fetchMock.mockResolvedValue(mockResponse({ documents: [] }));
      await listDocuments();

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options?.headers as Record<string, string> | undefined;
      expect(headers?.['Authorization']).toBeUndefined();
    });

    it('adds Bearer token when Supabase session exists', async () => {
      getAccessTokenMock.mockResolvedValue('test-jwt-token');

      fetchMock.mockResolvedValue(mockResponse({ documents: [] }));
      await listDocuments();

      expect(getAccessTokenMock).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer test-jwt-token');
      getAccessTokenMock.mockResolvedValue(null);
    });

    it('throws auth error on 401 response', async () => {
      fetchMock.mockResolvedValue(mockResponse({ error: 'Unauthorized' }, 401));
      await expect(listDocuments()).rejects.toThrow('Authentication expired');
    });
  });
});
