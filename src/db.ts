import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

export const pool = new Pool({ connectionString });

export async function pingDb() {
  const r = await pool.query('select 1 as ok');
  return r.rows[0].ok === 1;
}

export async function initializeSchema() {
  await pool.query('DROP TABLE IF EXISTS receipts;');
  
  const createReceiptsTable = `
    CREATE TABLE receipts (
      id SERIAL PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      store_name VARCHAR(255) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      receipt_id VARCHAR(255),
      product_id VARCHAR(255),
      receipt_created_timestamp TIMESTAMP,
      merchant_name VARCHAR(255),
      product_description TEXT,
      brand VARCHAR(255),
      product_category JSONB,
      total_price_paid DECIMAL(10, 2),
      product_code VARCHAR(255),
      product_image_url TEXT,
      enriched_brand VARCHAR(255),
      enriched_category JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(createReceiptsTable);
}

export interface ReceiptData {
  date: string;
  storeName: string;
  total: number;
  receipt_id?: string;
  product_id?: string;
  receipt_created_timestamp?: string;
  merchant_name?: string;
  product_description?: string;
  brand?: string;
  product_category?: string | string[];
  total_price_paid?: number;
  product_code?: string;
  product_image_url?: string;
}

export async function insertReceipt(receiptData: ReceiptData) {
  const {
    date,
    storeName,
    total,
    receipt_id,
    product_id,
    receipt_created_timestamp,
    merchant_name,
    product_description,
    brand,
    product_category,
    total_price_paid,
    product_code,
    product_image_url
  } = receiptData;

  const query = `
    INSERT INTO receipts (
      date, store_name, total,
      receipt_id, product_id, receipt_created_timestamp,
      merchant_name, product_description, brand, product_category,
      total_price_paid, product_code, product_image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id;
  `;

  const categoryJson = Array.isArray(product_category) 
    ? JSON.stringify(product_category) 
    : product_category ? JSON.stringify([product_category]) : null;

  const values = [
    date,
    storeName,
    total,
    receipt_id,
    product_id,
    receipt_created_timestamp,
    merchant_name,
    product_description,
    brand,
    categoryJson,
    total_price_paid,
    product_code,
    product_image_url
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}