# Agentic Workflow Lab

A personal playground for exploring modern AI engineering patterns, agentic systems, workflow orchestration, and intelligent automation.

## Overview

This repository serves as a hands-on environment for experimenting with concepts, architectures, and implementation patterns related to AI-driven workflows.

The focus is on understanding how autonomous and semi-autonomous systems can collaborate, reason, and execute complex tasks through structured workflows.

## Areas of Exploration

* Agentic AI systems
* Workflow orchestration
* Multi-agent coordination
* State management
* Human-in-the-loop processes
* Knowledge retrieval
* AI-assisted automation
* Evaluation and observability

## Goals

* Explore emerging AI engineering patterns
* Build practical prototypes and experiments
* Evaluate orchestration approaches
* Learn through iterative implementation
* Document findings and architectural decisions

## Current Status

Early development

This repository is actively evolving as new ideas, experiments, and workflows are explored.

---

## DocGovernance.ai (Demo App)

**AI-Driven Document Alignment & Governance Agent.**

A full-stack demo that validates a *Main Document* against an approved *Source of
Truth* using an agentic workflow (Microsoft Agent Framework). Retrieval is powered
by a **local, open-source RAG stack — [Weaviate](https://weaviate.io/)** (the same
vector DB that backs [Verba](https://github.com/weaviate/Verba)) — so no managed
search subscription is required.

### How it works

1. **Ingest** — the Source of Truth is chunked, vectorized (local
   `text2vec-transformers` embedder), and stored in Weaviate.
2. **Section search** — the Main Document is parsed locally and is
   **never vectorized**. Each section's text is used as a live query against the
   pre-indexed Source of Truth.
3. **Validate** — each section plus its retrieved reference context is sent to the
   LLM (Azure OpenAI) to detect direct contradictions, producing an alignment
   report (`totalSections`, `cleanSections`, `issuesFound`, `discrepancies`).
4. **Export** — the alignment report can be exported as a styled PDF directly from
   the browser (client-side generation, no backend storage needed).

### Supported file formats

| Role | Formats |
|------|---------|
| **Source of Truth** (ingested & vectorized) | `.docx`, `.doc`, `.pdf`, `.md`, `.markdown`, `.txt` |
| **Main Document** (parsed into sections for review) | `.docx`, `.doc`, `.pdf`, `.md`, `.markdown`, `.txt` |

### Project structure

```
configs/           # SINGLE source of all configuration (.env / .env.example)
workflows/         # Agentic workflow + verba_client.py (Weaviate RAG client)
backend/           # FastAPI server (main.py) + Dockerfile — ingest + validate
frontend/          # React (Vite) UI + Dockerfile/nginx — two-file upload + report
input/             # CLI mode only: drop a .docx here (UI uses temp files; git-ignored)
output/            # CLI mode only: generated QC reports (git-ignored)
diagram-outputs/   # CLI mode only: generated workflow diagrams (git-ignored)
docker-compose.yml # One command to run the whole stack
```

### Configuration — one file for everything

All settings (Azure OpenAI keys/URLs, ports, Weaviate connection) live in a single
file: `configs/.env`. Create it from the template and fill in your secrets:

```powershell
copy configs\.env.example configs\.env
# then edit configs\.env and set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY
```

`configs/.env` is git-ignored, so your keys are never committed. Docker Compose,
the Python backend, and Vite all read from this one file.

### Prerequisites

- Docker Desktop (recommended path), **or** Python 3.10+ and Node.js 18+ for
  running the pieces manually.

---

## Run it — Option A: everything in Docker (recommended)

```powershell
copy configs\.env.example configs\.env   # then add your Azure keys
docker compose --env-file configs/.env up -d --build
```

That builds and starts the frontend, backend, and the Weaviate RAG stack together.

- UI:       http://localhost:5173
- API docs: http://localhost:8001/docs
- Weaviate: http://localhost:8080
- Optional Verba inspector UI: `docker compose --env-file configs/.env --profile verba up -d` → http://localhost:8000

Open the UI, upload the **Source of Truth** and the **Main Document**, then click
**Run Alignment Check**.

---

## Run it — Option B: manual / local dev

Start the RAG stack in Docker, then run the app from source for hot-reload.

### 1. RAG stack (Weaviate)

```powershell
docker compose up -d weaviate t2v-transformers
```

### 2. Backend (FastAPI) — port 8001

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .            # installs deps from pyproject.toml
python -m uvicorn main:app --reload --port 8001
```

Endpoints:

- `POST /api/ingest-source` — index the Source of Truth into Weaviate
- `POST /api/validate` — run the section-by-section alignment check
- `POST /api/validate-stream` — same check, streamed as Server-Sent Events for live per-section progress
- `GET  /api/health` — liveness probe

### 3. Frontend (React) — port 5173

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server reads its port and API proxy
target from `configs/.env` and proxies `/api` to the backend.

> Security note: this is a public demo repo. Keep real credentials only in
> `configs/.env` (git-ignored). If a key was ever committed, rotate it.


