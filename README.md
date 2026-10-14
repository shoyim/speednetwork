# ⚡ SpeedNetwork

Real-time internet speed test that measures **ping, jitter, download and upload** directly in the browser. There's no database and no server-side state: everything is computed live.

## Features

- Live speedometer and speed graph while the test runs
- Ping / jitter over WebSocket, download and upload over HTTP streams
- Stateless backend with rate limiting and health checks
- One-command deployment with Docker Compose behind Nginx

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Fastify 4, `@fastify/websocket`, `@fastify/rate-limit`, TypeScript |
| Infra | Docker Compose, Nginx |

## Project structure

```
backend/   Fastify API — /health, /ping, /download, /upload, WebSocket
frontend/  Next.js UI — Speedometer, SpeedGraph, MetricsBar, ResultScreen
nginx/     Reverse proxy config
```

## Quick start (Docker)

```bash
cp .env.example .env      # adjust REGION, ALLOWED_ORIGIN, HTTP_PORT if needed
docker compose up -d --build
```

Then open http://localhost (or the port set in `HTTP_PORT`).

## Local development

```bash
# backend
cd backend && npm install && npm run dev

# frontend (in another terminal)
cd frontend && npm install && npm run dev
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `REGION` | Server region label shown in the UI | `local` |
| `ALLOWED_ORIGIN` | CORS origin for the backend | `*` |
| `NEXT_PUBLIC_WS_URL` | Public WebSocket URL (empty = auto-detect) | — |
| `HTTP_PORT` | Port exposed by Nginx | `80` |
