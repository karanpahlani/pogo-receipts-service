# Pogo Receipts Service

Ingestion and enrichment pipeline for Pogo receipt data, built with TypeScript, Postgres, and OpenAI-powered normalization.

## Quick Start

### **For Graders - 4 Simple Steps:**

**Step 1:** Clone and install
```bash
git clone https://github.com/karanpahlani/pogo-receipts-service.git
cd pogo-receipts-service
pnpm install
```

**Step 2:** Setup environment
```bash
cp .env.example .env
```

**Step 3:** Add API key
```bash
# Open .env in any text editor and replace this line:
# OPENAI_API_KEY=your_openai_api_key_here
# 
# With the actual API key from this 1Password link:
# https://share.1password.com/s#JmmPNp2Lvp9Xv4LhCFc0dkHBhFrmTYghI_sg-ko91n0
# OPENAI_API_KEY=sk-...your-actual-key...
```

**Step 4:** Start the service
```bash
pnpm start
```

**Done!** API available at `http://localhost:7646`

### **Quick Test (Optional)**
```bash
# Test the health endpoint
curl http://localhost:7646/health

# Test receipt ingestion
curl -X POST http://localhost:7646/ \
  -H "Content-Type: application/json" \
  -d '{"merchant_name": "Apple Store", "product_description": "MacBook Pro"}'
```

### Prerequisites
- Node.js 24+
- Docker and Docker Compose  
- pnpm 8.6+

### Installation & Setup

1. Clone and install dependencies:
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

3. **Start the service:**
```bash
pnpm start
```

The API will be available at `http://localhost:7646`

## API Endpoints

### Health Check
**GET** `/health`
- Returns server status
- **Response:** `{"status": "ok", "timestamp": "2024-01-15T10:30:00.000Z"}`

### Receipt Ingestion
**POST** `/`
- Ingests raw receipt data with AI-powered enrichment
- Accepts flexible receipt data format
- Auto-generates UUID for each receipt

**Example Request:**
```bash
curl -X POST http://localhost:7646/ \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Apple Store",
    "product_description": "MacBook Pro 13-inch M2",
    "price": 1299.99
  }'
```

**Success Response (200):**
```json
{
  "message": "Receipt ingested successfully",
  "id": "e84d63a9-900f-491f-9b6f-f69752577471",
  "enrichment": {
    "brand": "Apple",
    "category": ["Electronics", "Computers", "Laptops"],
    "confidence": "high"
  }
}
```

### Receipt Retrieval
**GET** `/receipts/:id`
- Retrieves receipt data by UUID
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
- **Docker Setup** (`docker-compose.yml`) - Containerized PostgreSQL database

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
- `pnpm start` - Start database and development server with hot reload
- `pnpm build` - Compile TypeScript to JavaScript  
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio for database management
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking

### Environment Variables
Configure your `.env` file:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5444/pogo_data

# OpenAI Configuration  
# Get API key from: https://share.1password.com/s#JmmPNp2Lvp9Xv4LhCFc0dkHBhFrmTYghI_sg-ko91n0
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
PORT=7646
NODE_ENV=development
```

### Docker Commands
```bash
# Start database and server
pnpm start

# Start database only
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres
```

## Testing the API

### Test Receipt Ingestion:
```bash
# Test with Apple Store receipt
curl -X POST http://localhost:7646/ \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Apple Store",
    "product_description": "MacBook Pro 13-inch M2",
    "price": 1299.99
  }'

# Test with flexible receipt data
curl -X POST http://localhost:7646/ \
  -H "Content-Type: application/json" \
  -d '{
    "MERCHANT_NAME": "Target",
    "PRODUCT_DESCRIPTION": "Nike Air Max sneakers",
    "BRAND": "Nike"
  }'
```

### Retrieve Receipt:
```bash
# Replace with actual UUID from ingestion response
curl http://localhost:7646/receipts/e84d63a9-900f-491f-9b6f-f69752577471
```

### Check Server Health:
```bash
curl http://localhost:7646/health
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

## Deployment & Scaling Strategy

### Production Deployment Options

#### Option 1: Cloud-Native (AWS)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│  ECS/Fargate    │───▶│   RDS/Aurora    │
│  (Rate Limiting)│    │ (Auto-scaling)  │    │  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Amazon SQS    │              │
         │              │ (Message Queue) │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼              ┌─────────────────┐              ▼
┌─────────────────┐    │  Lambda/Fargate │    ┌─────────────────┐
│   CloudWatch    │    │ (AI Enrichment) │    │   ElastiCache   │
│   (Monitoring)  │    │   Workers       │    │   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Components:**
- **API Gateway**: Request routing, rate limiting, authentication
- **ECS/Fargate**: Containerized API service with auto-scaling
- **RDS Aurora**: Managed PostgreSQL with read replicas
- **SQS**: Message queue for async enrichment processing
- **Lambda**: Serverless enrichment workers (cost-effective for sporadic loads)
- **ElastiCache**: Redis for caching and session management
- **CloudWatch**: Comprehensive monitoring and alerting

#### Option 2: Kubernetes (Multi-cloud)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Ingress     │───▶│   API Service   │───▶│   PostgreSQL    │
│   (Load Balancer)│   │  (3+ replicas)  │    │    (StatefulSet)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         │              │  (Message Queue)│              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼              ┌─────────────────┐              ▼
┌─────────────────┐    │   Enrichment    │    ┌─────────────────┐
│   Prometheus    │    │    Workers      │    │      PVC        │
│   Grafana       │    │ (HPA enabled)   │    │   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Key Features:**
- **Horizontal Pod Autoscaling**: Scale based on CPU/memory/custom metrics
- **StatefulSets**: For databases with persistent storage
- **ConfigMaps/Secrets**: Environment configuration management
- **Service Mesh**: Istio for traffic management and security
- **Helm Charts**: Templated deployments across environments

### Scaling Strategies

#### Horizontal Scaling
1. **API Service Scaling**
   ```yaml
   # Kubernetes HPA example
   apiVersion: autoscaling/v2
   kind: HorizontalPodAutoscaler
   metadata:
     name: receipts-api-hpa
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: receipts-api
     minReplicas: 3
     maxReplicas: 20
     metrics:
     - type: Resource
       resource:
         name: cpu
         target:
           type: Utilization
           averageUtilization: 70
   ```

2. **Database Read Scaling**
   - Read replicas for query distribution
   - Connection pooling (PgBouncer)
   - Query result caching (Redis)

3. **AI Enrichment Scaling**
   - Separate worker processes from API
   - Queue-based processing with multiple consumers
   - Rate limiting for OpenAI API calls

#### Vertical Scaling
- **Database**: Upgrade instance types during low-traffic windows
- **API Service**: Increase CPU/memory limits based on profiling
- **Redis**: Memory optimization for caching layer

### Performance Optimizations

#### Database Optimizations
```sql
-- Indexing strategy
CREATE INDEX CONCURRENTLY idx_receipts_merchant ON receipts(merchant_name);
CREATE INDEX CONCURRENTLY idx_receipts_created ON receipts(receipt_created_timestamp);
CREATE INDEX CONCURRENTLY idx_receipts_enrichment ON receipts(enrichment_confidence) WHERE enrichment_confidence IS NOT NULL;

-- Partitioning for large datasets
CREATE TABLE receipts_2024 PARTITION OF receipts 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

#### Caching Strategy
```typescript
// Multi-level caching
class CacheService {
  // L1: In-memory (Node.js)
  private memoryCache = new Map();
  
  // L2: Redis (shared across instances)
  private redisClient = new Redis(process.env.REDIS_URL);
  
  async get(key: string) {
    // Check memory first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Then Redis
    const cached = await this.redisClient.get(key);
    if (cached) {
      this.memoryCache.set(key, JSON.parse(cached));
      return JSON.parse(cached);
    }
    
    return null;
  }
}
```

#### API Rate Limiting & Circuit Breakers
```typescript
// OpenAI API circuit breaker
import { CircuitBreaker } from 'opossum';

const openaiBreaker = new CircuitBreaker(openai.chat.completions.create, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Graceful degradation
openaiBreaker.fallback(() => ({
  brand: 'unknown',
  category: ['unknown'],
  confidence: 'low'
}));
```

### Monitoring & Observability

#### Metrics to Track
- **API Metrics**: Request rate, response time, error rate
- **Database Metrics**: Connection pool usage, query performance, lock waits
- **Enrichment Metrics**: Queue depth, processing time, AI API success rate
- **Business Metrics**: Receipts processed per hour, enrichment accuracy

#### Alerting Strategy
```yaml
# Example Prometheus alert rules
groups:
- name: receipts-service
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      
  - alert: EnrichmentQueueBacklog
    expr: enrichment_queue_size > 1000
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Enrichment queue backing up"
```

### Cost Optimization

#### Resource Right-sizing
- **Development**: Smaller instances, shared databases
- **Staging**: Production-like but reduced capacity
- **Production**: Auto-scaling with appropriate limits

#### Serverless for Variable Workloads
```typescript
// AWS Lambda for enrichment workers
export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const receiptData = JSON.parse(record.body);
    await enrichReceipt(receiptData);
  }
};
```

**Benefits:**
- Pay only for actual processing time
- Automatic scaling to zero during idle periods
- No server management overhead
