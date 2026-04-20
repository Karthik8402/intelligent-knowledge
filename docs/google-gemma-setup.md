# Google Gemma Setup Guide

This guide configures the backend to use Google Gemma for answer generation.

## 1. Install backend dependencies

```powershell
cd backend
python -m pip install -r requirements.txt
```

## 2. Configure environment file

```powershell
copy .env.example .env
```

Set these values in `.env`:

```env
LLM_PROVIDER=google
LLM_MODEL=gemma-3-27b-it
GOOGLE_API_KEY=your_google_ai_studio_key
EMBEDDING_PROVIDER=google
EMBEDDING_MODEL=text-embedding-004
```

## 3. Start backend API

```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## 4. Start frontend

```powershell
cd frontend
npm install
npm run dev
```

## 5. Verify behavior

1. Upload a PDF or DOCX in the UI.
2. Ask a document-grounded question.
3. Confirm the answer includes citations.
4. Confirm missing-answer questions return this fallback text:
   The provided documents do not contain this information.

## Notes

- If you want to keep Google Gemma for LLM but use local embeddings, set:
  - `EMBEDDING_PROVIDER=huggingface`
  - `EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2`
- OpenAI and Groq provider paths remain available as optional alternatives.
