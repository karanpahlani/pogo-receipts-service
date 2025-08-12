import { Request, Response } from 'express';
import { insertReceipt, ReceiptData } from '../db.js';

function validateReceiptData(data: any): data is ReceiptData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.date === 'string' &&
    typeof data.storeName === 'string' &&
    typeof data.total === 'number'
  );
}

export default async function receiptsRoute(req: Request, res: Response) {
  try {
    if (!validateReceiptData(req.body)) {
      return res.status(400).json({
        error: 'Missing required fields: date, storeName, total',
        message: 'Required fields must be: date (string), storeName (string), total (number)'
      });
    }

    const receiptData: ReceiptData = req.body;
    const result = await insertReceipt(receiptData);
    
    res.status(201).json({
      message: 'Receipt ingested successfully',
      id: result.id,
      date: receiptData.date,
      storeName: receiptData.storeName,
      total: receiptData.total
    });
  } catch (error) {
    console.error('Error ingesting receipt:', error);
    res.status(500).json({
      error: 'Failed to ingest receipt',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}