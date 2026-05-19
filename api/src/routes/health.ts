import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let db = false;
  try {
    await pool.query('SELECT 1');
    db = true;
  } catch {}

  let ollama = false;
  try {
    const r = await fetch(`${process.env.OLLAMA_URL}/api/tags`);
    ollama = r.ok;
  } catch {}

  res.status(db ? 200 : 503).json({ db, ollama });
});

export default router;
