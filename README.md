# Pogo Receipts Service

Ingestion and enrichment pipeline for Pogo receipt data, built with TypeScript, Postgres, and OpenAI-powered normalization.

## Quick Start

### **🚀 For Graders - 4 Simple Steps:**

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
# With the actual API key from your take-home instructions:
# OPENAI_API_KEY=sk-...your-actual-key...
```

**Step 4:** Start the service
```bash
pnpm start
```

✅ **Done!** API available at `http://localhost:7646`

### **🧪 Quick Test (Optional)**
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
# Edit .env and replace 'your_openai_api_key_here' with your actual API key
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
