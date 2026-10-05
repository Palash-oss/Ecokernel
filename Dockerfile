# ================================================================
# EcoKernel — Production Multi-Stage Dockerfile
# ================================================================

# ─── Stage 1: Build Frontend (Node.js + Vite) ──────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Python Backend Runtime (FastAPI + Uvicorn) ──────
FROM python:3.11-slim
WORKDIR /app

# Install necessary build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PORT=8001
ENV PYTHONUNBUFFERED=1
EXPOSE 8001

WORKDIR /app/backend
CMD ["python", "main.py"]
