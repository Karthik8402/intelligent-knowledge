export type DocumentMetadata = {
  document_id: string;
  file_name: string;
  source_type: string;
  pages: number;
  chunks: number;
  created_at: string;
};

export type Citation = {
  document_id: string;
  file_name: string;
  page: number | null;
  snippet: string;
};

export type RetrievedChunk = {
  document_id: string;
  file_name: string;
  page: number | null;
  score: number | null;
  text: string;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
  retrieved_chunks: RetrievedChunk[];
};

export type UploadResult = {
  document_id: string;
  file_name: string;
  pages: number;
  chunks: number;
  status: 'indexed' | 'duplicate' | 'failed';
  error: string | null;
};
