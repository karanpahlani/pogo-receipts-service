import 'dotenv/config';
import express from 'express';
import receiptsRoute from './routes/receipts.js';
import { pingDb } from './db.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/health', async (_req, res) => {
  try {
    const ok = await pingDb();
    res.json({ ok });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.post('/receipts', receiptsRoute);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`api listening on :${port}`);
});