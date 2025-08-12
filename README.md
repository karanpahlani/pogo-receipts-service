# Pogo Receipts Service

A TypeScript-based receipt ingestion and enrichment pipeline that accepts raw receipt data via HTTP API and stores it in PostgreSQL.

## Quick Start

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- npm

### Installation & Setup

1. Clone and install dependencies:
```bash
git clone <repository-url>
cd pogo-receipts-service
npm install
```

2. Start the database:
```bash
docker compose up -d db
```

3. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
**GET** `/health`
- Returns database connectivity status
- **Response:** `{"ok": true}` or `{"ok": false}`

### Receipt Ingestion
**POST** `/receipts`
- Ingests raw receipt data and stores in database
- **Required fields:**
  - `date` (string) - Receipt date in ISO format
  - `storeName` (string) - Name of the store
  - `total` (number) - Total amount spent

**Example Request:**
```bash
curl -X POST http://localhost:3000/receipts \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15T10:30:00Z",
    "storeName": "Target", 
    "total": 45.67,
    "product_description": "Optional additional fields..."
  }'
```

**Success Response (201):**
```json
{
  "message": "Receipt ingested successfully",
  "id": 1,
  "date": "2024-01-15T10:30:00Z",
  "storeName": "Target",
  "total": 45.67
}
```

**Validation Error (400):**
```json
{
  "error": "Missing required fields: date, storeName, total",
  "message": "Required fields must be: date (string), storeName (string), total (number)"
}
```

## Architecture

```
┌─────────────────┐    HTTP POST     ┌─────────────────┐
│   Client App    │ ────────────────▶│   Express API   │
│                 │                  │   (Port 3000)   │
└─────────────────┘                  └─────────┬───────┘
                                               │
                                               ▼
                                     ┌─────────────────┐
                                     │  PostgreSQL DB  │
                                     │   (Port 5432)   │
                                     │                 │
                                     │ ┌─────────────┐ │
                                     │ │ receipts    │ │
                                     │ │ table       │ │
                                     │ └─────────────┘ │
                                     └─────────────────┘
```

### Components:
- **Express Server** (`src/server.ts`) - HTTP API server with JSON middleware
- **Database Layer** (`src/db.ts`) - PostgreSQL connection and schema management
- **Routes** (`src/routes/receipts.ts`) - Receipt ingestion endpoint with validation
- **Docker Setup** (`docker-compose.yml`) - Containerized PostgreSQL database

## Database Schema

```sql
CREATE TABLE receipts (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  store_name VARCHAR(255) NOT NULL, 
  total DECIMAL(10, 2) NOT NULL,
  -- Additional optional fields for future enrichment
  receipt_id VARCHAR(255),
  product_id VARCHAR(255), 
  product_description TEXT,
  brand VARCHAR(255),
  product_category JSONB,
  enriched_brand VARCHAR(255),
  enriched_category JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled JavaScript (production)

### Environment Variables
Create a `.env` file:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pogo
PORT=3000
NODE_ENV=development
```

### Docker Commands
```bash
# Start database only
docker compose up -d db

# Start full stack (requires Dockerfile)
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f
```

## Testing the API

### Test Receipt Ingestion:
```bash
# Valid receipt
curl -X POST http://localhost:3000/receipts \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15T14:30:00Z",
    "storeName": "Walmart",
    "total": 89.45
  }'

# Test validation
curl -X POST http://localhost:3000/receipts \
  -H "Content-Type: application/json" \
  -d '{"storeName": "Target"}'
```

### Check Database Connection:
```bash
curl http://localhost:3000/health
```

## Next Steps and Production Considerations

### Immediate Enhancements
1. **Data Enrichment Pipeline**
   - Integrate OpenAI API for product categorization
   - Implement brand name standardization
   - Add receipt parsing for structured data extraction

2. **Batch Processing**
   - Support bulk receipt uploads
   - Add CSV import functionality
   - Implement async processing queue

3. **Validation & Error Handling**
   - Add date format validation
   - Implement duplicate detection
   - Enhanced error logging and monitoring

### Scaling Considerations
1. **Database**
   - Add indexes for common queries
   - Implement connection pooling
   - Consider read replicas for analytics

2. **API Layer** 
   - Add rate limiting
   - Implement authentication/authorization
   - Add request logging and metrics

3. **Infrastructure**
   - Container orchestration (Kubernetes)
   - Load balancing
   - Monitoring and alerting setup

### Production Deployment
```yaml
# docker-compose.prod.yml example
version: '3.9'
services:
  api:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@prod-db:5432/pogo
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## Monitoring & Observability

Future monitoring setup recommendations:
- Health check endpoints for Kubernetes probes
- Structured logging with correlation IDs
- Metrics collection (Prometheus/Grafana)
- Error tracking (Sentry)
- Database query performance monitoring
