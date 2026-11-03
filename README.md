# AudioMind

Transcribe audio files, search the transcripts, and ask questions
about them in a chat UI with source citations (RAG).

## Features

- **Transcription** - Deepgram nova-3 (default, with speaker labels)
  or OpenAI whisper-1. One file can have transcripts from both.
- **Hybrid search** - OpenAI `text-embedding-3-small` vectors in
  sqlite-vec, plus SQLite FTS5 keyword search, merged by rank
- **Chat** - OpenAI answers from the matching transcript segments,
  with timestamps
- **Local storage** - One SQLite file via `node:sqlite`; schema in
  `src/lib/server/schema.sql`

## Requirements

- Node.js 24.15+ (CI uses 26)
- pnpm
- API keys:
  - [OpenAI](https://platform.openai.com) - chat, embeddings, and
    optional transcription
  - [Deepgram](https://deepgram.com) - transcription (default
    provider)

## Setup

```sh
pnpm install
cp .env.example .env   # then add your keys
pnpm cli init
```

The database defaults to `data/audiomind.db`. Set `DATABASE_PATH` to
change it; the CLI and the app read the same variable.

## CLI

Transcribe, embed and save in one step. The title comes from the ID3
tag unless you pass `--title`:

```sh
pnpm cli process episode.mp3
pnpm cli process episode.mp3 --title "Episode 1" --url https://example.com/ep1
pnpm cli process episode.mp3 --provider openai   # files up to 25 MB
pnpm cli process episode.mp3 --provider openai --media 1  # add a second transcript to media 1
```

Transcribe once, save later (avoids paying to transcribe twice):

```sh
pnpm cli transcribe episode.mp3 -o episode.json
pnpm cli ingest episode.json --title "Episode 1"
```

Other commands:

```sh
pnpm cli search "topic you're looking for" --limit 20
pnpm cli list                     # media and their transcripts
pnpm cli inspect episode.mp3      # ID3 metadata
pnpm cli rename 1 "New title"
pnpm cli delete 1                 # removes transcripts, vectors, FTS rows
```

## Web interface

```sh
pnpm dev
```

## Tech stack

- SvelteKit 3, vite-plus, Tailwind CSS, shadcn-svelte
- `node:sqlite`, sqlite-vec, FTS5
- AI SDK with OpenAI; Deepgram REST API
- CLI: citty, music-metadata

## Development

```sh
pnpm dev          # dev server
pnpm check        # vp check + svelte-check
pnpm lint         # vp check
pnpm test:ci      # unit tests
pnpm test:e2e     # Playwright
pnpm build
```

## License

MIT
