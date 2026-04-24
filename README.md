# Distributed Log System

A production-grade distributed log ingestion, processing, and querying system built with **Node.js**, **Redis Streams**, and **PostgreSQL**.

```
Log Sources → [Ingestion API] → [Redis Streams] → [Processing Service] → [PostgreSQL]
                                                                              ↓
                                              [Dashboard UI] ← [Query API + WebSocket]
```

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Message Broker | Redis 7+ (Streams) |
| Database | PostgreSQL 16 (JSONB + full-text search) |
| Live Streaming | Redis Pub/Sub + WebSocket |
| Web Framework | Express.js |
| Dashboard | Vanilla HTML/CSS/JS + Chart.js |
| Containerization | Docker Compose |

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 20+

### 1. Clone & Install

```bash
git clone https://github.com/Lokie027/distributed-log-system.git
cd distributed-log-system
cp .env.example .env
npm install
```

### 2. Start Infrastructure

```bash
# Start Redis + PostgreSQL
docker-compose up -d

# Run database migrations
npm run db:migrate
```

### 3. Start Services

Open 4 separate terminal windows:

```bash
# Terminal 1 — Ingestion Service (port 3001)
npm run dev:ingestion

# Terminal 2 — Processing Service
npm run dev:processing

# Terminal 3 — Query Service (port 3003)
npm run dev:query

# Terminal 4 — Dashboard (port 3000)
npm run dev:dashboard
```

### 4. Seed Sample Data

```bash
# Generate 5,000 sample logs
npm run seed

# Or specify a count
node scripts/seed-logs.js 1000
```

### 5. Open Dashboard

Visit **http://localhost:3000** in your browser.

## Architecture

### Services

| Service | Port | Description |
|---|---|---|
| **Ingestion** | 3001 | HTTP API that receives logs and pushes to Redis Streams |
| **Processing** | — | Consumes from Redis, enriches, and batch-writes to PostgreSQL |
| **Query** | 3003 | REST API + WebSocket for searching and live tailing |
| **Dashboard** | 3000 | Web UI with search, charts, and real-time streaming |

### API Endpoints

#### Ingestion Service (`:3001`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/logs` | Ingest a single log event |
| POST | `/api/logs/batch` | Ingest up to 100 logs |
| GET | `/health` | Health check |

#### Query Service (`:3003`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search` | Full-text search with filters |
| GET | `/api/search/:id` | Get a single log |
| GET | `/api/stats` | Aggregated statistics |
| WS | `/api/stream` | Live log tail (WebSocket) |

### Log Event Schema

```json
{
  "level": "info",
  "source": "auth-service",
  "message": "User login successful",
  "metadata": { "userId": "u-123", "ip": "192.168.1.1" },
  "tags": ["auth", "login"],
  "environment": "production"
}
```

## Scripts

| Command | Description |
|---|---|
| `npm run docker:up` | Start Redis + PostgreSQL |
| `npm run docker:down` | Stop infrastructure |
| `npm run db:migrate` | Run database migrations |
| `npm run seed` | Generate 5,000 sample logs |
| `npm run health` | Check all service health |
| `npm run dev:ingestion` | Start ingestion service (dev) |
| `npm run dev:processing` | Start processing service (dev) |
| `npm run dev:query` | Start query service (dev) |
| `npm run dev:dashboard` | Start dashboard (dev) |

## License

MIT
