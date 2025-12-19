# AudioMind

A podcast transcription and semantic search tool with an AI-powered
chat interface. Transcribe audio files, generate embeddings, and ask
questions about your podcast content using RAG (Retrieval Augmented
Generation).

## Features

- **Audio Transcription** - Transcribe podcasts using Deepgram's Nova-3
  model with smart formatting and paragraph detection
- **Semantic Search** - Vector similarity search powered by Voyage AI
  embeddings and sqlite-vec
- **AI Chat Interface** - Ask questions about your podcasts with
  context-aware responses using Claude
- **ID3 Tag Support** - Automatically extract podcast and episode
  metadata from audio files
- **Local Storage** - All data stored locally in SQLite

## Requirements

- Node.js 22+
- pnpm
- API keys for:
  - [Deepgram](https://deepgram.com) - Audio transcription
  - [Voyage AI](https://voyageai.com) - Text embeddings
  - [Anthropic](https://anthropic.com) - AI chat (Claude)

## Setup

1. Clone the repository and install dependencies:

```sh
pnpm install
```

2. Create a `.env` file with your API keys:

```sh
DEEPGRAM_API_KEY=your_key
VOYAGE_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

3. Initialize the database:

```sh
pnpm cli init
```

## CLI Usage

The CLI provides tools for processing audio files and managing your
podcast library.

### Process an Audio File

Full pipeline - transcribe, embed, and ingest in one command:

```sh
pnpm cli process path/to/episode.mp3
```

Podcast name and episode title are auto-detected from ID3 tags. Override
with flags:

```sh
pnpm cli process episode.mp3 --podcast "My Podcast" --episode "Episode 1"
```

### Search Your Library

```sh
pnpm cli search "topic you're looking for"
pnpm cli search "machine learning" --limit 20
pnpm cli search "interviews" --podcast "Tech Talk"
```

### Other Commands

```sh
pnpm cli list                    # List all podcasts and episodes
pnpm cli inspect audio.mp3       # View audio file metadata
pnpm cli transcribe audio.mp3    # Transcribe only (no embedding)
pnpm cli update --podcast 1 --name "New Name"  # Update metadata
```

## Web Interface

Start the development server:

```sh
pnpm dev
```

The web interface provides a chat UI where you can ask questions about
your ingested podcasts. Responses include source citations with
timestamps.

## Tech Stack

- **Frontend**: SvelteKit, Tailwind CSS, shadcn-svelte
- **Backend**: SvelteKit API routes, better-sqlite3, sqlite-vec
- **AI**: Anthropic Claude (chat), Voyage AI (embeddings), Deepgram
  (transcription)
- **CLI**: citty, music-metadata

## Project Structure

```
src/
├── cli/           # CLI tool for processing audio
├── lib/
│   ├── components/  # Svelte components
│   └── server/      # Server-side utilities (database, AI clients)
└── routes/
    ├── api/         # API endpoints for chat
    └── chat/        # Chat interface pages
```

## Development

```sh
pnpm dev          # Start dev server
pnpm check        # Type check
pnpm lint         # Lint code
pnpm test         # Run tests
pnpm build        # Production build
```

## License

MIT
