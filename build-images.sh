#!/usr/bin/env bash
# =============================================================================
# build-images.sh — Build all DocGovernance.ai Docker images
# =============================================================================
# Run this after any code change to rebuild the application images.
#
#   ./build-images.sh            # build backend + frontend
#   ./build-images.sh --no-cache # force a clean rebuild (ignore layer cache)
#
# NOTE on images:
#   - backend  : FastAPI API + the agentic workflow engine (workflows/ is
#                copied INTO this image — there is no separate "workflow" image).
#   - frontend : React app built and served by nginx.
#   - weaviate / t2v-transformers / verba are pulled from registries, not built.
#
# After building, start the stack with:
#   docker compose --env-file configs/.env up -d
# =============================================================================

set -euo pipefail

# Always run from the repo root (the directory this script lives in).
cd "$(dirname "$0")"

NO_CACHE=""
if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
  echo "==> Clean rebuild requested (--no-cache)"
fi

# Image tags (override with env vars if you like, e.g. TAG=v1.0).
# These names MUST match the `image:` keys in docker-compose.yml so that
# `docker compose up` reuses exactly the images this script builds.
TAG="${TAG:-latest}"
BACKEND_IMAGE="docgovernance-ai-backend:${TAG}"
FRONTEND_IMAGE="docgovernance-ai-frontend:${TAG}"

echo "============================================================"
echo " Building backend (API + workflow engine) -> ${BACKEND_IMAGE}"
echo "   Build context: repo root (needs backend/ and workflows/)"
echo "============================================================"
docker build ${NO_CACHE} -f backend/Dockerfile -t "${BACKEND_IMAGE}" .

echo "============================================================"
echo " Building frontend (React + nginx) -> ${FRONTEND_IMAGE}"
echo "============================================================"
docker build ${NO_CACHE} -f frontend/Dockerfile -t "${FRONTEND_IMAGE}" ./frontend

echo "============================================================"
echo " Done. Built images:"
echo "   - ${BACKEND_IMAGE}   (backend API + agentic workflow)"
echo "   - ${FRONTEND_IMAGE}  (React UI served by nginx)"
echo ""
echo " Start the full stack with:"
echo "   docker compose --env-file configs/.env up -d"
echo "============================================================"
