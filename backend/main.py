"""
FastAPI server exposing the document-alignment workflow (DocGovernance.ai).

Two-phase flow (matches the frontend orchestration):
  1. POST /api/ingest-source -> upload the Source-of-Truth file; it is forwarded
     to the local Verba service, which chunks + vectorizes + stores it.
  2. POST /api/validate      -> upload the Main Document; it is parsed locally
     (python-docx, never vectorized) and each section is queried against the
     pre-indexed Source of Truth to produce the alignment report.

GET /api/health -> simple liveness probe.

Run locally (Verba occupies port 8000, so this API runs on 8001):
    uvicorn main:app --reload --port 8001
"""

import json
import os
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# --- Make the sibling `workflows/` package importable ------------------------
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# --- Load centralized configuration (configs/.env) BEFORE importing workflow -
from dotenv import load_dotenv  # noqa: E402

load_dotenv(PROJECT_ROOT / "configs" / ".env")

from workflows.doc_governance_workflow import (  # noqa: E402
    run_validation_for_file,
    run_validation_stream,
)
from workflows.verba_client import VerbaClient  # noqa: E402

ALLOWED_EXTENSIONS = {".docx", ".doc", ".pdf", ".md", ".markdown", ".txt"}

app = FastAPI(
    title="DocGovernance.ai API",
    description="AI-driven document alignment against a local Verba reference source.",
    version="2.0.0",
)

# Allow the Vite dev server (and other local origins) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


async def _save_temp(file: UploadFile) -> tuple[Path, Path]:
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    tmp_dir = Path(tempfile.mkdtemp(prefix="docgov_"))
    tmp_path = tmp_dir / (file.filename or "document")
    tmp_path.write_bytes(contents)
    return tmp_path, tmp_dir


def _cleanup(tmp_path: Path, tmp_dir: Path) -> None:
    try:
        tmp_path.unlink(missing_ok=True)
        tmp_dir.rmdir()
    except OSError:
        pass


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/ingest-source")
async def ingest_source(file: UploadFile = File(...)) -> dict:
    """Phase 1: ingest the Source-of-Truth file into Verba (chunk + vectorize)."""
    filename = file.filename or "source"
    _validate_extension(filename)
    tmp_path, tmp_dir = await _save_temp(file)

    try:
        result = await VerbaClient.from_env().import_document(str(tmp_path))
    except Exception as ex:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"Source ingestion into Verba failed: {ex}",
        ) from ex
    finally:
        _cleanup(tmp_path, tmp_dir)

    return {"status": "ingested", "fileName": filename, "verba": result}


@app.post("/api/validate")
async def validate(file: UploadFile = File(...)) -> dict:
    """Phase 2: validate the Main Document against the pre-indexed Source of Truth."""
    filename = file.filename or "document"
    _validate_extension(filename)
    tmp_path, tmp_dir = await _save_temp(file)

    try:
        report = await run_validation_for_file(str(tmp_path), write_to_disk=False)
    except Exception as ex:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Validation failed: {ex}") from ex
    finally:
        _cleanup(tmp_path, tmp_dir)

    report["fileName"] = filename
    return report


@app.post("/api/validate-stream")
async def validate_stream(file: UploadFile = File(...)) -> StreamingResponse:
    """Phase 2 (streaming): same validation, but emits live per-section progress.

    Returns Server-Sent Events. Each event is a JSON line:
      {"type": "progress", "index", "total", "title", "status"}  per section
      {"type": "report", "report": {...}}                        final result
      {"type": "error", "message": "..."}                        on failure
    """
    filename = file.filename or "document"
    _validate_extension(filename)
    tmp_path, tmp_dir = await _save_temp(file)

    async def event_generator():
        try:
            async for msg in run_validation_stream(str(tmp_path)):
                if msg.get("type") == "report":
                    msg["report"]["fileName"] = filename
                yield f"data: {json.dumps(msg)}\n\n"
        except Exception as ex:  # noqa: BLE001
            yield f"data: {json.dumps({'type': 'error', 'message': str(ex)})}\n\n"
        finally:
            _cleanup(tmp_path, tmp_dir)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable proxy buffering (nginx)
        },
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("BACKEND_PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
