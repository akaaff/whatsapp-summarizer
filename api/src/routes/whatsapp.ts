import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { sessionManager } from '../whatsapp/SessionManager';
import { pool } from '../db/pool';

const router = Router();
router.use(requireAuth);

// Start session and return QR code
router.get('/qr', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const status = sessionManager.getStatus(userId);

  if (status === 'linked') {
    res.status(200).json({ status: 'linked', message: 'Already linked' });
    return;
  }

  await sessionManager.create(userId);

  // Poll up to 15s for the QR to be generated
  for (let i = 0; i < 15; i++) {
    const qr = sessionManager.getQR(userId);
    if (qr) {
      res.json({ qr });
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  res.status(504).json({ error: 'QR generation timed out — try again' });
});

// Session link status
router.get('/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const status = sessionManager.getStatus(userId);

  // Also check DB for users whose session isn't in memory
  if (status === 'unlinked') {
    const { rows } = await pool.query(
      'SELECT status FROM whatsapp_sessions WHERE user_id = $1',
      [userId]
    );
    res.json({ status: rows[0]?.status ?? 'unlinked' });
    return;
  }

  res.json({ status });
});

// Unlink / logout
router.delete('/session', async (req: AuthRequest, res: Response): Promise<void> => {
  await sessionManager.destroy(req.userId!);
  res.json({ message: 'Session unlinked' });
});

// List chats
router.get('/chats', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  // Return distinct chats from message cache
  const { rows } = await pool.query(
    `SELECT chat_id,
            MAX(sender) AS last_sender,
            MAX(timestamp) AS last_message_at,
            COUNT(*) AS message_count
     FROM cached_messages
     WHERE user_id = $1
     GROUP BY chat_id
     ORDER BY last_message_at DESC`,
    [userId]
  );

  res.json({ chats: rows });
});

// Get messages for a chat filtered by date range
router.get('/chats/:chatId/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { chatId } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params required (ISO 8601)' });
    return;
  }

  const { rows } = await pool.query(
    `SELECT sender, body, timestamp
     FROM cached_messages
     WHERE user_id = $1 AND chat_id = $2
       AND timestamp >= $3 AND timestamp <= $4
     ORDER BY timestamp ASC`,
    [userId, chatId, new Date(from as string), new Date(to as string)]
  );

  res.json({ chatId, messages: rows, count: rows.length });
});

export default router;
