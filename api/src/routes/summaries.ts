import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';
import { runPipeline } from '../summary/pipeline';
import { Message } from '../summary/chunker';

const router = Router();
router.use(requireAuth);

// Request a new summary (async — returns immediately with request ID)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { chat_id, date_from, date_to, language = 'English' } = req.body;

  if (!chat_id || !date_from || !date_to) {
    res.status(400).json({ error: 'chat_id, date_from, and date_to are required' });
    return;
  }

  const from = new Date(date_from);
  const to = new Date(date_to);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    res.status(400).json({ error: 'Invalid date format — use ISO 8601' });
    return;
  }

  // Create the request record in pending state
  const { rows } = await pool.query(
    `INSERT INTO summary_requests (user_id, chat_id, date_from, date_to, language, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [userId, chat_id, from, to, language]
  );
  const requestId = rows[0].id;

  res.status(202).json({ id: requestId, status: 'pending' });

  // Run pipeline in background — don't await
  runSummaryAsync(userId, requestId, chat_id, from, to, language);
});

async function runSummaryAsync(
  userId: string,
  requestId: string,
  chatId: string,
  from: Date,
  to: Date,
  language: string
): Promise<void> {
  try {
    const { rows } = await pool.query<Message>(
      `SELECT sender, body, timestamp
       FROM cached_messages
       WHERE user_id = $1 AND chat_id = $2
         AND timestamp >= $3 AND timestamp <= $4
       ORDER BY timestamp ASC`,
      [userId, chatId, from, to]
    );

    const result = await runPipeline(rows, language);

    await pool.query(
      `UPDATE summary_requests SET status = 'done', result = $1 WHERE id = $2`,
      [result, requestId]
    );
  } catch (err: any) {
    console.error(`Summary ${requestId} failed:`, err.message);
    await pool.query(
      `UPDATE summary_requests SET status = 'failed', result = $1 WHERE id = $2`,
      [err.message, requestId]
    );
  }
}

// Get a specific summary by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT id, chat_id, date_from, date_to, language, status, result, created_at
     FROM summary_requests
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.userId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Summary not found' });
    return;
  }
  res.json(rows[0]);
});

// List all summaries for the user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT id, chat_id, date_from, date_to, language, status, created_at
     FROM summary_requests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.userId]
  );
  res.json({ summaries: rows });
});

export default router;
