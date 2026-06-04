# DocGovernance.ai — Backend (FastAPI + Microsoft Agent Framework)
# Build context MUST be the repo root so we can copy both `backend/` and
# `workflows/`:   docker build -f backend/Dockerfile .
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install Python dependencies first (better layer caching).
COPY backend/pyproject.toml ./pyproject.toml
RUN pip install .

# Copy application code.
COPY workflows/ ./workflows/
COPY backend/ ./backend/

WORKDIR /app/backend
EXPOSE 8001

# Config (Azure keys, ports, Weaviate host) is injected at runtime via
# docker-compose `env_file: configs/.env` — secrets are never baked into the image.
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
