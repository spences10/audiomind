# AudioMind v1 Architecture

Documentation of original implementation before rebuild.

## Tech Stack

- **Database:** Turso (libsql) - cloud SQLite
- **Transcription:** Deepgram (nova-2 model)
- **Embeddings:** Voyage AI (voyage-01 model)
- **LLM:** Claude 3 Haiku
- **Framework:** SvelteKit

## Database Schema

```sql
CREATE TABLE transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_title TEXT NOT NULL,
  segment_text TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL
)

CREATE TABLE embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transcript_id INTEGER NOT NULL,
  embedding TEXT NOT NULL,  -- JSON: { vector: number[] }
  FOREIGN KEY(transcript_id) REFERENCES transcripts(id)
)
```

## Key Files

### `/src/lib/server/database.ts`

- Turso client setup
- `init_database()` - creates tables if not exist

### `/src/lib/server/deepgram.ts`

- `transcribe_audio(audio_buffer: ArrayBuffer)` - transcribes audio
- Uses Deepgram SDK with `nova-2` model
- Returns paragraphs with `{ text, start, end }` timestamps
- Timeout scales with file size (max 5 min)

### `/src/lib/server/voyage.ts`

- `generate_embedding(text: string)` - returns number[]
- Direct fetch to Voyage API
- Model: `voyage-01` (older, consider voyage-3)

### `/src/lib/server/cache.ts`

- LRU caches for:
  - embeddings (500, 24h TTL)
  - search results (100, 1h TTL)
  - claude responses (200, 2h TTL)

### `/src/routes/api/process-episode/+server.ts`

Ingestion pipeline:

1. Receive FormData (audio file + title)
2. Transcribe via Deepgram
3. For each segment:
   - Insert into `transcripts` table
   - Generate embedding via Voyage
   - Insert into `embeddings` table (as JSON)
4. Progress updates via store

### `/src/routes/api/search/similarity.ts`

Vector search:

- `search_similar_segments(query)` - returns SearchResult[]
- Generates query embedding
- Batched DB fetch (100 at a time)
- Manual cosine similarity computation
- Threshold: 0.6, Max results: 10

```typescript
interface SearchResult {
	similarity: number;
	text: string;
	episode: string;
}
```

### `/src/routes/api/search/claude-stream.ts`

RAG response:

- `create_claude_stream(query, top_results, response_style)`
- Streams search results first
- Then streams Claude response
- Caches complete responses

### `/src/routes/api/search/+server.ts`

Main search endpoint:

1. Call `search_similar_segments(query)`
2. If results, create Claude stream
3. Return SSE stream

## App Config

```typescript
{
  app_name: 'AudioMind',
  ai: {
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    system_prompt: '...',  // speaks as direct voice of content
    style_instructions: { normal, concise, explanatory, formal }
  },
  default_response_style: 'normal'
}
```

## Response Styles

- **normal** - balanced, clear sections
- **concise** - brief bullets
- **explanatory** - detailed breakdown
- **formal** - professional structure

## Cosine Similarity (manual)

```typescript
function compute_cosine_similarity(a: number[], b: number[]): number {
	const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
	const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
	const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
	return dot / (magA * magB);
}
```

## v2 Changes Planned

- Turso -> local SQLite + sqlite-vec
- voyage-01 -> voyage-3
- claude-3-haiku -> claude-3-5-haiku (4.5)
- Add podcasts table (selectable datasets)
- UI: shadcn-svelte + svelte-ai-elements
