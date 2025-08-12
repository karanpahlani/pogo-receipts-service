# Pogo Receipts Service

Ingestion and enrichment pipeline for Pogo receipt data, built with TypeScript, Postgres, and OpenAI-powered normalization.

## Quick Start

### Prerequisites
- Node.js 24+
- Docker and Docker Compose  
- pnpm 8.6+

### Installation & Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/karanpahlani/pogo-receipts-service.git
cd pogo-receipts-service
pnpm install
```

2. **Setup environment:**
```bash
cp .env.example .env
# Edit .env and replace 'your_openai_api_key_here' with the API key from:
# https://share.1password.com/s#JmmPNp2Lvp9Xv4LhCFc0dkHBhFrmTYghI_sg-ko91n0
```

3. **Start both PostgreSQL and the service:**
```bash
pnpm start
```

This will build and start both PostgreSQL and the Node.js service. The API will be available at `http://localhost:7646`

**Alternative for development (local Node.js):**
```bash
pnpm dev
```

## API Endpoints

### Health Check
**GET** `/health`
- Returns server status
- **Response:** `{"status": "ok", "timestamp": "2024-01-15T10:30:00.000Z"}`

### Receipt Ingestion
**POST** `/receipt`
- Ingests raw receipt data with AI-powered enrichment
- Accepts flexible receipt data format
- Uses `receipt_id` from the data as primary key

**Example Request:**
```bash
curl -X POST http://localhost:7646/receipt \
  -H "Content-Type: application/json" \
  -d '{
    "receipt_id": "RCP12345",
    "product_id": "PRD67890",
    "receipt_created_timestamp": "2024-08-12T10:30:00Z",
    "merchant_name": "Apple Store",
    "product_description": "MacBook Pro 13-inch M2",
    "brand": "Apple",
    "product_category": ["Electronics", "Computers", "Laptops"],
    "total_price_paid": 1299.99,
    "product_code": "MBPM2-13",
    "product_image_url": "https://example.com/macbook.jpg"
  }'
```

**Success Response (201):**
```json
{
  "message": "Receipt ingested successfully",
  "receipt_id": "RCP12345",
  "enrichment": {
    "brand": "Apple",
    "category": ["Electronics", "Computers", "Laptops"],
    "confidence": "high"
  }
}
```

### Receipt Retrieval
**GET** `/receipt/:receipt_id`
- Retrieves receipt data by receipt_id
- **Response:** Complete receipt with enrichment data

## Architecture

```
┌─────────────────┐    HTTP POST     ┌─────────────────┐      ┌─────────────────┐
│   Client App    │ ────────────────▶│   Express API   │────▶ │   OpenAI API    │
│                 │                  │   (Port 7646)   │      │   (Enrichment)  │
└─────────────────┘                  └─────────┬───────┘      └─────────────────┘
                                               │
                                               ▼
                                     ┌─────────────────┐
                                     │  PostgreSQL DB  │
                                     │   (Port 5444)   │
                                     │ Drizzle ORM     │
                                     │ ┌─────────────┐ │
                                     │ │ receipts    │ │
                                     │ │ table       │ │
                                     │ └─────────────┘ │
                                     └─────────────────┘
```

### Components:
- **Express Server** (`src/index.ts`) - Main API server with async error handling
- **AI Enrichment** (`src/services/enrichment.ts`) - OpenAI-powered data normalization
- **Database Layer** (`src/db/` directory) - Drizzle ORM with PostgreSQL
- **Schemas** (`src/db/schemas.ts`) - Database schema definitions with enrichment fields
- **Docker Setup** (`docker-compose.yml`) - Containerized PostgreSQL and Node.js service

## Database Schema

Built with Drizzle ORM for type-safe database operations:

```typescript
export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  receiptId: text('receipt_id'),
  productId: text('product_id'),
  receiptCreatedTimestamp: timestamp('receipt_created_timestamp'),
  merchantName: text('merchant_name'),
  productDescription: text('product_description'),
  brand: text('brand'),
  productCategory: jsonb('product_category'),
  totalPricePaid: text('total_price_paid'),
  productCode: text('product_code'),
  productImageUrl: text('product_image_url'),
  // AI Enrichment fields
  enrichedBrand: text('enriched_brand'),
  enrichedCategory: jsonb('enriched_category'),
  enrichmentConfidence: text('enrichment_confidence'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

## Development

### Available Scripts
- `pnpm start` - Start both PostgreSQL and Node.js service with Docker Compose
- `pnpm dev` - Start PostgreSQL with Docker, run Node.js locally with hot reload
- `pnpm build` - Compile TypeScript to JavaScript  
- `pnpm test` - Run unit tests
- `pnpm test:integration` - Run integration tests (uses Docker containers)
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio for database management
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking

### Environment Variables
```env
DATABASE_URL=postgresql://postgres:password@localhost:5444/pogo_data
OPENAI_API_KEY=your_openai_api_key_here
PORT=7646
NODE_ENV=development
```

### Docker Usage
```bash
# Start both services (recommended)
docker-compose up --build

# Start in background
docker-compose up -d --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f receipts-service
docker-compose logs -f postgres

# Rebuild and restart
docker-compose up --build --force-recreate
```

## Testing the API

```bash
# Health check
curl http://localhost:7646/health

# Receipt ingestion
curl -X POST http://localhost:7646/receipt \
  -H "Content-Type: application/json" \
  -d '{"receipt_id": "RCP12345", "merchant_name": "Apple Store", "product_description": "MacBook Pro 13-inch M2", "total_price_paid": 1299.99}'

# Retrieve receipt (replace with actual receipt_id)
curl http://localhost:7646/receipt/RCP12345
```

## Features

### AI-Powered Data Enrichment
- **Brand Standardization**: Normalizes brand names (e.g., "amazon.com" → "Amazon")
- **Category Classification**: Multi-level product categorization using OpenAI
- **Confidence Scoring**: High/medium/low confidence ratings for enrichment quality
- **Flexible Input**: Handles various receipt data formats and field naming conventions

### Current Capabilities
- Receipt ingestion with automatic UUID generation
- Real-time AI enrichment using OpenAI GPT-4o-mini
- Type-safe database operations with Drizzle ORM
- Structured error handling and validation
- Health monitoring endpoints

### Production Features
- **Database Migrations**: Automated schema management with Drizzle Kit
- **Docker Integration**: Containerized PostgreSQL setup
- **TypeScript**: Full type safety across the application
- **Modern Tooling**: pnpm, tsx for fast development iteration

## Technical Stack

- **Runtime**: Node.js 24+ with ES modules
- **Language**: TypeScript with strict type checking
- **Framework**: Express.js with async error handling
- **Database**: PostgreSQL 16 with Drizzle ORM
- **AI Integration**: OpenAI API via AI SDK
- **Package Manager**: pnpm for efficient dependency management
- **Development**: tsx for fast TypeScript execution
- **Containerization**: Docker Compose for local development

## Project Structure

```
src/
├── index.ts              # Main server and API endpoints
├── ai.ts                 # OpenAI integration wrapper  
├── services/
│   └── enrichment.ts     # AI enrichment logic
├── db/
│   ├── connection.ts     # Database connection setup
│   ├── schemas.ts        # Drizzle schema definitions
│   └── migrations/       # Database migration files
├── middleware/
│   └── errorHandler.ts   # Express error handling
└── scripts/
    ├── healthcheck.ts    # Health check utility
    └── sendReceipts.ts   # Testing utilities
```

## Evolution to ELT Pipeline & Adding New Data Sources

### Current Architecture (ETL)
The current implementation follows an **ETL** (Extract, Transform, Load) pattern:
1. **Extract**: Data comes via HTTP POST endpoint
2. **Transform**: AI enrichment happens in-memory before storage
3. **Load**: Enriched data is stored in PostgreSQL

### Evolution to ELT Pipeline

To evolve this into a production **ELT** (Extract, Load, Transform) pipeline:

#### Phase 1: Separate Ingestion from Enrichment
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Sources   │───▶│  Ingestion  │───▶│   Raw Data  │───▶│ Enrichment  │
│             │    │   Service   │    │   Storage   │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Changes needed:**
- Split `/` endpoint into `/ingest` (raw data only) and background enrichment job
- Add `raw_receipts` table for unprocessed data
- Create `enrichment_queue` table for async processing
- Implement worker service for enrichment processing

#### Phase 2: Add Message Queue
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Ingestion  │───▶│  Queue      │───▶│ Enrichment  │
│  Service    │    │ (Redis/SQS) │    │  Workers    │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Benefits:**
- Decoupled processing allows independent scaling
- Retry logic for failed enrichments
- Better monitoring and observability
- Multiple workers can process in parallel

### Adding New Data Sources

The current architecture makes adding new sources straightforward:

#### 1. File-Based Sources (CSV, JSON)
```typescript
// src/services/fileIngestion.ts
export async function processCsvFile(filePath: string) {
  const records = await parseCSV(filePath);
  for (const record of records) {
    await ingestReceipt(transformCsvToReceipt(record));
  }
}
```

#### 2. API-Based Sources (Third-party APIs)
```typescript
// src/services/apiIngestion.ts
export async function syncFromPartnerAPI() {
  const client = new PartnerAPIClient();
  const receipts = await client.getRecentReceipts();
  
  for (const receipt of receipts) {
    await ingestReceipt(transformPartnerFormatToReceipt(receipt));
  }
}
```

#### 3. Real-time Sources (Webhooks, Kafka)
```typescript
// src/routes/webhooks.ts
app.post('/webhooks/partner', async (req, res) => {
  const receiptData = transformWebhookToReceipt(req.body);
  await enqueueForEnrichment(receiptData);
  res.status(200).send('OK');
});
```

### Proposed ELT Architecture

```
                    ┌─────────────────┐
                    │   Data Lake     │
                    │ (Raw JSONs/CSVs)│
                    └─────────────────┘
                            │
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│  HTTP APIs  │───▶│                 │───▶│             │
├─────────────┤    │   Ingestion     │    │   Raw Data  │
│ File Uploads│───▶│   Service       │───▶│   Storage   │
├─────────────┤    │                 │    │ PostgreSQL  │
│  Webhooks   │───▶│                 │    │             │
└─────────────┘    └─────────────────┘    └─────────────┘
                            │                      │
                    ┌─────────────────┐            │
                    │  Message Queue  │◀───────────┘
                    │  (Redis/SQS)    │
                    └─────────────────┘
                            │
                    ┌─────────────────┐    ┌─────────────┐
                    │   Enrichment    │───▶│  Enriched   │
                    │    Workers      │    │    Data     │
                    │                 │    │ PostgreSQL  │
                    └─────────────────┘    └─────────────┘
                            │
                    ┌─────────────────┐
                    │   Analytics     │
                    │   & Reports     │
                    └─────────────────┘
```

**Key Components:**
- **Ingestion Service**: Handles all data sources, minimal transformation
- **Message Queue**: Decouples ingestion from processing
- **Enrichment Workers**: Scalable AI processing with retry logic
- **Data Lake**: Raw data backup for reprocessing
- **Monitoring**: Health checks, metrics, alerting

## Deployment & Scaling

### Production Options
- **Cloud-Native (AWS)**: ECS/Fargate + RDS Aurora + SQS + Lambda workers
- **Kubernetes**: Multi-replica API service + StatefulSet PostgreSQL + HPA scaling
- **Serverless**: Lambda functions for variable workloads with pay-per-use pricing

### Scaling Strategies
- **Horizontal**: API service auto-scaling, database read replicas, worker queues
- **Vertical**: Instance upgrades during maintenance windows
- **Optimizations**: Database indexing, multi-level caching, circuit breakers
