# AudioMind v2 Progress

## Completed

### Database

- SQLite + sqlite-vec (local, no Turso)
- Schema: `src/lib/server/schema.sql`
- Tables: podcasts, episodes, segments, segments_vec (virtual)
- Init via `hooks.server.ts`

### CLI (`cli.ts`)

Commands:

- `init` - create tables
- `transcribe <mp3>` - Deepgram API (nova-3)
- `embed <transcript.json>` - Voyage API (voyage-3.5-lite, 1024 dim)
- `ingest <embeddings.json> -p -e` - insert to SQLite
- `process <mp3> -p -e` - full pipeline
- `search "query"` - vector search
- `list` - show podcasts/episodes

Run with:

```bash
node --experimental-strip-types --env-file=.env cli.ts <command>
```

### sqlite-vec Quirks Found

1. Virtual table uses implicit rowid, not named primary key
2. Bound params for rowid need `CAST(? AS INTEGER)`
3. KNN queries need `k = N` not `LIMIT N`
4. Embeddings inserted via `vec_f32(?)` for JSON arrays

### Test Data

- "Grumpy SEO Guy" podcast, 1 episode (May 10 2023)
- 186 segments with embeddings
- Search working

## Remaining

### UI Setup

- shadcn-svelte for components
- svelte-ai-elements for chat UI
- Need to install and configure

### Chat/RAG Flow

- Search endpoint (use existing CLI search logic)
- Anthropic streaming (Haiku 4.5)
- `src/lib/server/anthropic.ts` exists but needs integration

## Tech Stack (Final)

- **Transcription:** Deepgram (nova-3)
- **Embeddings:** Voyage (voyage-3.5-lite, 1024 dim)
- **Storage:** SQLite + sqlite-vec
- **LLM:** Anthropic Haiku 4.5
- **UI:** shadcn-svelte + svelte-ai-elements
- **Framework:** SvelteKit + Svelte 5

## Files Created/Modified

- `cli.ts` - CLI tool
- `src/lib/server/schema.sql` - DB schema
- `src/lib/server/database.ts` - DB connection
- `src/lib/server/anthropic.ts` - Anthropic client
- `src/lib/server/voyage.ts` - Voyage client (not used, CLI handles)
- `src/lib/server/deepgram.ts` - Deepgram client (not used, CLI
  handles)
- `src/hooks.server.ts` - DB init on startup
- `data/audiomind.db` - SQLite database file

## Env Vars Needed

```
DEEPGRAM_API_KEY=
VOYAGE_API_KEY=
ANTHROPIC_API_KEY=
```
