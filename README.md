# Pogo Receipts Service

Ingestion and enrichment pipeline for Pogo receipt data, built with TypeScript, Postgres, and OpenAI-powered normalization.

## Quick Start

### Prerequisites
- Node.js 24+
- Docker and Docker Compose  
- pnpm 8.6+

### Quick Start (Recommended)

**🐳 Run with Docker (Primary Method):**
```bash
git clone https://github.com/karanpahlani/pogo-receipts-service.git
cd pogo-receipts-service

# Setup environment
cp .env.example .env
# Edit .env and add your OpenAI API key from:
# https://share.1password.com/s#JmmPNp2Lvp9Xv4LhCFc0dkHBhFrmTYghI_sg-ko91n0

# Start everything with Docker (builds automatically on first run)
docker-compose up --build
```

> **⚠️ Important for Fresh Machines:** If you encounter "relation receipts missing" errors, this means the database migrations haven't run. The Docker setup now automatically runs migrations on startup, but if you need to run them manually:
```bash
# Run migrations manually (if needed)
pnpm db:migrate

# To simulate a fresh machine (destroy all data and volumes):
docker compose down -v
docker compose up --build
docker system prune -a      # Optional: remove all unused images/cache
```

The API will be available at `http://localhost:7646`

**📦 Alternative: Local Development**
```bash
# Install dependencies
pnpm install

# Start PostgreSQL with Docker, Node.js locally
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
- **Query Parameters:**
  - `?enrich=true` - Forces AI enrichment even when brand/category are already present

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
    "upc": "123456789012",
    "size": "13-inch",
    "color": "Space Gray",
    "material": "Aluminum",
    "model": "Pro",
    "weight": "3.0 lbs",
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

> **Production Database Design**: In a production environment, I would implement a two-table design with `raw_receipts` and `enriched_receipts` to maintain data lineage and enable reprocessing. For this scoped take-home, I'm using a single table with `enriched_*` suffixed fields to demonstrate the functionality while keeping the implementation focused.

### **SQL Schema Definition**

```sql
-- Generated from Drizzle schema (src/db/schemas.ts)
CREATE TABLE "receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "receipt_id" text,                          -- Source receipt identifier
  "product_id" text,                          -- Product line item ID
  "receipt_created_timestamp" timestamp,       -- Purchase timestamp
  "merchant_name" text,                       -- Store/merchant name
  "product_description" text,                 -- Product description
  "brand" text,                              -- Original/filled brand
  "product_category" jsonb,                  -- Original/filled category array
  "total_price_paid" real,                   -- Price paid by customer
  "product_code" text,                       -- UPC/EAN/SKU code
  "product_image_url" text,                  -- Product image URL
  
  -- AI Enrichment fields (always populated from AI processing)
  "enriched_brand" text,                     -- Standardized brand name
  "enriched_category" jsonb,                 -- AI-generated category hierarchy
  "enriched_upc" text,                       -- Extracted/validated 12-digit UPC
  "enriched_size" text,                      -- Product size/dimensions
  "enriched_color" text,                     -- Primary product color
  "enriched_material" text,                  -- Construction material
  "enriched_model" text,                     -- Product model/variant
  "enriched_weight" text,                    -- Product weight with units
  "enrichment_confidence" text,              -- 'high' | 'medium' | 'low'
  
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

### **TypeScript Schema (Drizzle ORM)**

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
  totalPricePaid: real('total_price_paid'),
  productCode: text('product_code'),
  productImageUrl: text('product_image_url'),
  // AI Enrichment fields
  enrichedBrand: text('enriched_brand'),
  enrichedCategory: jsonb('enriched_category'),
  enrichedUpc: text('enriched_upc'),
  enrichedSize: text('enriched_size'),
  enrichedColor: text('enriched_color'),
  enrichedMaterial: text('enriched_material'),
  enrichedModel: text('enriched_model'),
  enrichedWeight: text('enriched_weight'),
  enrichmentConfidence: text('enrichment_confidence'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### **Database Migrations**

The project uses **Drizzle Kit** for automated schema migrations. All migrations are version-controlled and applied automatically.

#### **Migration History:**
```bash
# 0000: Initial receipts table with core fields
CREATE TABLE receipts (id, receipt_id, product_description, brand, etc.)

# 0001: Updated primary key strategy 
ALTER TABLE receipts...

# 0002: Added JSONB support for product_category
ALTER TABLE receipts ALTER COLUMN product_category TYPE jsonb...

# 0003: Added AI enrichment fields
ALTER TABLE receipts ADD COLUMN enriched_brand text;
ALTER TABLE receipts ADD COLUMN enriched_category jsonb;
ALTER TABLE receipts ADD COLUMN enrichment_confidence text;

# 0004: Added UPC enrichment
ALTER TABLE receipts ADD COLUMN enriched_upc text;

# 0005: Added product detail enrichments  
ALTER TABLE receipts ADD COLUMN enriched_size text;
ALTER TABLE receipts ADD COLUMN enriched_color text;
ALTER TABLE receipts ADD COLUMN enriched_material text;
ALTER TABLE receipts ADD COLUMN enriched_model text;
ALTER TABLE receipts ADD COLUMN enriched_weight text;
```

#### **Migration Commands:**
```bash
# Generate migration after schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# View current schema in browser
pnpm db:studio

# Reset database (⚠️ destructive)
docker-compose down -v && docker-compose up --build
```

#### **Migration Files Location:**
```
src/db/migrations/
├── 0000_tricky_talos.sql           # Initial table creation
├── 0001_perpetual_killraven.sql    # PK updates  
├── 0002_quiet_annihilus.sql        # JSONB category
├── 0003_omniscient_banshee.sql     # Basic enrichment fields
├── 0004_sudden_outlaw_kid.sql      # UPC field
├── 0005_sleepy_black_tarantula.sql # Product detail fields
└── meta/                           # Migration metadata
    ├── _journal.json               # Migration history
    └── *.json                      # Snapshots
```

**Key Design Decisions:**
- **UUID Primary Keys**: Better for distributed systems
- **JSONB for Arrays**: Efficient storage and querying for categories
- **Separate Enriched Fields**: Maintains data lineage and confidence tracking
- **Nullable Enrichment**: Low confidence results stored as null/"unknown"

## Development

### Available Scripts
- `pnpm start` - Start both PostgreSQL and Node.js service with Docker Compose
- `pnpm dev` - Start PostgreSQL with Docker, run Node.js locally with hot reload
- `pnpm build` - Compile TypeScript to JavaScript  
- `pnpm test` - Run unit tests
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking

**Database Management:**
- `pnpm db:generate` - Generate migrations after schema changes
- `pnpm db:migrate` - Apply pending migrations to database
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

### Environment Variables
```env
DATABASE_URL=postgresql://postgres:password@localhost:5444/pogo_data
OPENAI_API_KEY=your_openai_api_key_here
PORT=7646
NODE_ENV=development
```

### Docker Commands

```bash
# First time or after code changes
docker-compose up --build

# Subsequent runs (if no code changes)
docker-compose up

# Run in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f receipts-service
docker-compose logs -f postgres

# Force rebuild (if issues)
docker-compose up --build --force-recreate
```

**About `--build` option:**
- **Necessary when**: Code changes, Dockerfile changes, or first run
- **What it does**: Rebuilds the Docker images before starting containers
- **Skip it when**: No code changes since last build (faster startup)

## Testing the API

```bash
# Health check
curl http://localhost:7646/health

# Receipt ingestion (basic)
curl -X POST http://localhost:7646/receipt \
  -H "Content-Type: application/json" \
  -d '{"receipt_id": "RCP12345", "merchant_name": "Apple Store", "product_description": "MacBook Pro 13-inch M2", "total_price_paid": 1299.99}'

# Receipt ingestion with force enrichment (even when brand/category already present)
curl -X POST "http://localhost:7646/receipt?enrich=true" \
  -H "Content-Type: application/json" \
  -d '{"receipt_id": "RCP12346", "merchant_name": "Apple Store", "product_description": "MacBook Pro 13-inch M2", "brand": "Apple", "product_category": ["Electronics"], "total_price_paid": 1299.99}'

# Retrieve receipt by ID
curl http://localhost:7646/receipt/RCP12345

# Retrieve receipt with force enrichment
curl http://localhost:7646/receipt/RCP12346
```

## Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests (auto-starts Docker containers)
pnpm test:integration:docker

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

**Test Coverage:**
- Unit tests: AI enrichment, validation, middleware
- Integration tests: API endpoints, database operations, end-to-end workflow
- Coverage threshold: 85% statements, 80% branches

## Features

### AI-Powered Data Enrichment
- **Brand Standardization**: Normalizes brand names (e.g., "amazon.com" → "Amazon")
- **Category Classification**: Multi-level product categorization using OpenAI
- **UPC Identification**: Extracts or validates 12-digit Universal Product Codes
- **Product Details**: Extracts size, color, material, model, and weight information
- **Missing Field Detection**: Automatically fills in missing brand/category when confident
- **Confidence-Based Updates**: Updates original fields only with high-confidence enrichments
- **Low-Confidence Handling**: Marks uncertain fields as "unknown" while preserving enriched alternatives
- **Flexible Input**: Handles various receipt data formats and field naming conventions
- **Force Enrichment**: Use `?enrich=true` query parameter to enrich all records regardless of existing data

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

## Production Evolution: ELT Pipeline & Multi-Source Architecture

### Current State (ETL)
The current implementation processes data synchronously: **HTTP → AI Enrichment → Database**. This works for the take-home scope but has scaling limitations.

### Production Evolution Strategy

#### 1. **Immediate: Dual-Table Design**
```sql
-- Raw ingestion (fast, no AI processing)
CREATE TABLE raw_receipts (id, receipt_id, raw_data, ingested_at, source);

-- Enriched processing (async)  
CREATE TABLE enriched_receipts (id, receipt_id, enriched_data, confidence, processed_at);
```

**Benefits:** Data lineage, reprocessing capability, faster ingestion

#### 2. **Next: Message Queue Decoupling**
```typescript
// Fast ingestion endpoint (stores raw + queues for processing)
app.post('/ingest', async (req, res) => {
  const receipt = await db.insert(rawReceipts).values({
    receiptId: req.body.receipt_id,
    rawData: req.body,
    source: req.headers['x-source'] || 'api',
    status: 'pending'
  });
  
  // Add to Redis queue (includes data to avoid DB lookup)
  await redisQueue.add('enrich-receipt', {
    receiptId: req.body.receipt_id,
    rawData: req.body,  // Worker gets data from queue, not DB
    priority: req.body.priority || 'normal'
  });
  
  res.status(202).json({ status: 'queued', receiptId: receipt.receiptId });
});

// Background worker (reads from queue, processes, writes to DB)
const worker = new Worker('enrich-receipt', async (job) => {
  const { receiptId, rawData } = job.data;
  
  // AI processing (expensive operation)
  const enriched = await enrichReceiptData(rawData.product_description, rawData.merchant_name);
  
  // Store results
  await db.insert(enrichedReceipts).values({ 
    receiptId, 
    enrichedData: enriched,
    processedAt: new Date()
  });
  
  // Update raw record status
  await db.update(rawReceipts)
    .set({ status: 'processed', processedAt: new Date() })
    .where(eq(rawReceipts.receiptId, receiptId));
}, {
  connection: redisConnection,
  concurrency: 5,  // Process 5 jobs in parallel
  removeOnComplete: 100,  // Keep last 100 completed jobs
  removeOnFail: 50
});
```

**Queue Technology Options:**
- **Redis + Bull/BullMQ**: Good for moderate throughput, easy setup, job retry/scheduling
- **AWS SQS**: Managed service, high reliability, auto-scaling
- **RabbitMQ**: Advanced routing, guaranteed delivery, complex workflows
- **Apache Kafka**: High-throughput streaming, event sourcing, real-time analytics

### Adding New Data Sources

#### **File Processing (S3 Drops)**
```typescript
// src/services/fileProcessor.ts
export class FileProcessor {
  async processS3File(bucket: string, key: string) {
    const stream = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();
    const parser = key.endsWith('.csv') ? new CSVParser() : new JSONLParser();
    
    for await (const record of parser.parse(stream)) {
      await this.ingestRecord(record, 's3-batch');
    }
  }
  
  private async ingestRecord(data: any, source: string) {
    const normalized = this.normalizeSchema(data); // Handle field variations
    await db.insert(rawReceipts).values({ 
      receiptId: normalized.receipt_id,
      rawData: normalized, 
      source 
    });
    await this.enqueueEnrichment(normalized.receipt_id);
  }
}
```

#### **Webhook Integration (Real-time Partners)**
```typescript
// src/routes/webhooks.ts
app.post('/webhooks/:partner', validateWebhook, async (req, res) => {
  const { partner } = req.params;
  const transformer = getTransformer(partner); // Partner-specific mapping
  
  const receipts = transformer.extract(req.body);
  for (const receipt of receipts) {
    await fileProcessor.ingestRecord(receipt, `webhook-${partner}`);
  }
  
  res.status(200).json({ processed: receipts.length });
});
```

#### **API Polling (Legacy Systems)**
```typescript
// src/jobs/apiSync.ts
export class APISyncJob {
  @cron('*/15 * * * *') // Every 15 minutes
  async syncPartnerData() {
    const lastSync = await getLastSyncTime('partner-api');
    const client = new PartnerAPIClient();
    
    const receipts = await client.getReceipts({ since: lastSync });
    for (const receipt of receipts) {
      const normalized = this.transformPartnerFormat(receipt);
      await fileProcessor.ingestRecord(normalized, 'partner-api');
    }
    
    await updateLastSyncTime('partner-api', new Date());
  }
}
```

### Production Architecture

```
Data Sources          Ingestion           Queue              Workers            Storage
┌─────────────┐      ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Partner APIs│─────▶│             │───▶│             │───▶│             │───▶│             │
├─────────────┤      │  Ingestion  │    │  Message    │    │ Enrichment  │    │ PostgreSQL  │
│ File Drops  │─────▶│   Service   │───▶│   Queue     │───▶│  Workers    │───▶│   - Raw     │
├─────────────┤      │             │    │(Redis/SQS)  │    │ (Multiple)  │    │   - Enriched│
│ Webhooks    │─────▶│             │    │             │    │             │    │             │
├─────────────┤      └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│ Manual API  │             │                   │                   │
└─────────────┘             │                   │                   │
                           ▼                   ▼                   ▼
                    Store Raw Data      Queue Jobs        Process & Store
                    (Fast Response)    (Reliable)        (AI + Database)
```

**Flow:** `Data → Store Raw → Queue Job → Worker Processes → Store Enriched`
- **Ingestion**: Fast storage + queue, immediate response  
- **Queue**: Reliable job delivery, retry logic, scaling buffer
- **Workers**: Read from queue (not DB), process with AI, write results

### Implementation Priorities

1. **Week 1**: Dual-table schema + basic queue (Redis)
2. **Week 2**: File processing service + S3 integration  
3. **Week 3**: Webhook endpoints + partner-specific transformers
4. **Week 4**: Monitoring, retry logic, dead letter queues

### Scaling Considerations

- **Ingestion**: Horizontal scaling via load balancer
- **Queue**: Redis Cluster or SQS for high throughput  
- **Workers**: Auto-scaling based on queue depth
- **Database**: Read replicas for analytics, partitioning by date
- **Monitoring**: Queue depth, processing lag, error rates

This evolution maintains the current API contract while enabling multi-source ingestion and production-scale processing.

## Scalability & Maintainability

### **Current Limitations & Solutions**

#### **Scalability Bottlenecks:**
- **Synchronous AI Processing**: Blocks HTTP responses (2-5s latency)
  - *Solution*: Message queue + background workers
- **Single Database**: All operations hit one PostgreSQL instance  
  - *Solution*: Read replicas for analytics, connection pooling
- **AI Rate Limits**: OpenAI API throttling at high volume
  - *Solution*: Request batching, caching common patterns

#### **Maintainability Strengths:**
- **Type Safety**: Full TypeScript prevents runtime errors
- **Clear Architecture**: Separate API, business logic, and data layers
- **Automated Migrations**: Drizzle Kit tracks all schema changes
- **Docker Setup**: Consistent development/production environments
- **Modular Design**: Easy to add new enrichment fields or data sources

### **Scaling Strategy**
```
Current: 50 receipts/min (ETL, synchronous)
Target:  1000+ receipts/min (ELT, async queues)

Horizontal Scaling:
- API servers: Load balancer + multiple Node.js instances  
- Workers: Auto-scale based on queue depth
- Database: Read replicas + partitioning by date
```

### **Monitoring Essentials**
- **Performance**: API latency, throughput, AI processing time
- **Reliability**: Error rates, database connection health
- **Quality**: Enrichment confidence levels, data completeness
