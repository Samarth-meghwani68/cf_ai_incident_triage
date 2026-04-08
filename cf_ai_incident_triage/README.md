# cf_ai_incident_triage

An AI-powered incident triage assistant for software engineers, built entirely on the Cloudflare edge platform.

Paste logs, stack traces, error messages, or bug reports — get structured triage analysis, ask follow-up questions, and generate clean incident reports.

## Features

- **Structured AI Triage** — Analyzes input and returns summary, severity, root causes, debugging steps, and confidence level
- **Follow-up Chat** — Ask context-aware questions about the analyzed incident
- **Incident Report Generation** — Generate a formatted engineering report from the session
- **Session Memory** — Conversation history preserved via Durable Objects
- **Case History** — Past sessions stored in D1 for review
- **Professional UI** — Dark-themed engineering tool aesthetic

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Cloudflare Edge                  │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌────────────┐ │
│  │  Pages    │───▶│  Worker  │───▶│  Durable   │ │
│  │ Frontend  │    │   API    │    │  Object    │ │
│  │ (Static)  │    │ (Router) │    │ (Session)  │ │
│  └──────────┘    └────┬─────┘    └─────┬──────┘ │
│                       │                │         │
│                  ┌────▼─────┐    ┌─────▼──────┐ │
│                  │    D1    │    │ Workers AI  │ │
│                  │ (SQLite) │    │(Llama 3.1)  │ │
│                  └──────────┘    └────────────┘ │
└──────────────────────────────────────────────────┘
```

| Component | Purpose |
|---|---|
| **Pages Frontend** | Static HTML/CSS/JS served from the edge |
| **Worker API** | Request routing, validation, DO orchestration |
| **Durable Object** | Per-session state, AI coordination, conversation history |
| **D1** | Persistent case/message/report storage |
| **Workers AI** | LLM inference (Llama 3.1 8B Instruct) |

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **Language**: TypeScript (backend), JavaScript (frontend)
- **LLM**: Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **State**: Durable Objects (per-session actor)
- **Fonts**: Inter + JetBrains Mono (Google Fonts)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) 3+
- A Cloudflare account with Workers AI access

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd cf_ai_incident_triage
npm install
```

### 2. Create D1 database

```bash
npx wrangler d1 create incident-triage-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "incident-triage-db"
database_id = "YOUR_ACTUAL_DATABASE_ID"  # ← paste here
```

### 3. Run D1 migrations

For local development:
```bash
npm run db:migrate:local
```

For remote (production):
```bash
npm run db:migrate:remote
```

### 4. Start local development

```bash
npm run dev
```

This runs `wrangler dev --remote`, which uses your remote Cloudflare account for Workers AI inference while serving locally. Open `http://localhost:8787`.

> **Note**: Workers AI requires `--remote` mode. Local-only mode (`npm run dev:local`) will work for frontend/routing but AI calls will fail.

### 5. Deploy to production

```bash
npm run deploy
```

This deploys the Worker, Durable Objects, and frontend assets to your Cloudflare account.

## Usage

1. **Open the app** at `http://localhost:8787` (dev) or your deployed URL
2. **Paste logs or errors** into the text area
3. **Click "Analyze"** to get a structured triage result
4. **Ask follow-up questions** in the chat below the result
5. **Generate a report** when you're ready to share findings
6. **Copy the report** to clipboard for your incident management tool

### Example Inputs

**Python traceback:**
```
Traceback (most recent call last):
  File "app/api/handlers.py", line 142, in handle_request
    result = await db.execute(query, params)
  File "app/db/pool.py", line 89, in execute
    conn = await self.pool.acquire(timeout=30)
asyncpg.exceptions.TooManyConnectionsError: sorry, too many clients already
  Active connections: 100/100
  Pending requests: 342
```

**API failure:**
```
2024-12-01T14:23:01Z ERROR [api-gateway] POST /api/v2/users/bulk-import
  Status: 504 Gateway Timeout
  Duration: 30.001s
  Upstream: user-service:8080
  Error: context deadline exceeded
  Request-ID: req-abc-123
  Retry-Count: 3/3
```

## Project Structure

```
cf_ai_incident_triage/
├── frontend/                   # Static frontend (served by Pages)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js              # Main controller
│       ├── api.js              # API client
│       ├── ui.js               # DOM rendering
│       └── utils.js            # Helpers
├── worker/                     # Cloudflare Worker (TypeScript)
│   └── src/
│       ├── index.ts            # Entry point
│       ├── router.ts           # API routing
│       ├── handlers/           # Route handlers
│       ├── durable-objects/    # Session DO
│       ├── services/           # AI + DB layers
│       ├── prompts/            # LLM prompt templates
│       ├── types/              # TypeScript interfaces
│       ├── validation/         # Input validation
│       └── utils/              # Error handling, JSON parsing
├── migrations/                 # D1 SQL migrations
├── wrangler.toml               # Cloudflare config
├── PROMPTS.md                  # AI prompt documentation
└── README.md
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions/:id/triage` | Submit input for AI triage |
| `POST` | `/api/sessions/:id/chat` | Send follow-up message |
| `POST` | `/api/sessions/:id/report` | Generate incident report |
| `GET` | `/api/sessions/:id` | Get session state |
| `GET` | `/api/cases` | List past cases |
| `GET` | `/api/cases/:id` | Get case detail |
| `GET` | `/api/health` | Health check |

## Configuration

The AI model is configurable in `wrangler.toml`:

```toml
[vars]
AI_MODEL = "@cf/meta/llama-3.1-8b-instruct"
```

To use a different model, change this value to any Workers AI text generation model.

## Limitations

- **Model accuracy**: The AI may misidentify root causes, especially with vague or incomplete input. Always verify findings.
- **Context window**: Input is limited to 15,000 characters. Very large log files should be trimmed to the relevant sections.
- **Conversation length**: Sessions are capped at 20 messages to prevent token overflow.
- **Structured output**: The LLM occasionally returns malformed JSON. The app retries once and falls back to raw output if parsing fails.
- **No authentication**: This MVP has no auth. Add Cloudflare Access for production use.
- **Single model**: Uses a single 8B parameter model. Larger models would improve accuracy but increase latency and cost.

## License

MIT
