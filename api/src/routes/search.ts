import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';
import { embed, generate } from '../summary/OllamaClient';
import { ollamaQueue } from '../summary/RequestQueue';
import { embedPendingMessages } from '../search/EmbeddingService';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { chat_id, query, limit = 8 } = req.body;

  if (!chat_id || !query) {
    res.status(400).json({ error: 'chat_id and query are required' });
    return;
  }
  if (typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'query must be a non-empty string' });
    return;
  }

  // Verify chat belongs to this user
  const { rows: chatCheck } = await pool.query(
    `SELECT 1 FROM cached_messages WHERE user_id = $1 AND chat_id = $2 LIMIT 1`,
    [userId, chat_id]
  );
  if (chatCheck.length === 0) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }

  // Lazy-embed any messages that haven't been indexed yet
  await embedPendingMessages(userId, chat_id);

  // Embed the query and find the closest messages by cosine distance
  const queryVector = await ollamaQueue.add(() => embed(query.trim()));
  const { rows: sources } = await pool.query<{
    sender: string; body: string; timestamp: Date;
  }>(
    `SELECT cm.sender, cm.body, cm.timestamp
     FROM message_embeddings me
     JOIN cached_messages cm ON cm.id = me.message_id
     WHERE me.user_id = $1 AND me.chat_id = $2
     ORDER BY me.embedding <=> $3::vector
     LIMIT $4`,
    [userId, chat_id, JSON.stringify(queryVector), limit]
  );

  if (sources.length === 0) {
    res.json({ answer: 'No indexed messages found for this chat.', sources: [] });
    return;
  }

  // Sort sources chronologically for the prompt so the LLM sees a coherent thread
  const sorted = [...sources].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const context = sorted
    .map((r) => `[${new Date(r.timestamp).toISOString().slice(0, 16).replace('T', ' ')}] ${r.sender}: ${r.body}`)
    .join('\n');

  const prompt =
    `You are answering a question about a WhatsApp conversation.\n` +
    `Use only the messages below. Be concise. If the answer is not in the messages, say so.\n\n` +
    `Messages:\n${context}\n\n` +
    `Question: ${query.trim()}\n\nAnswer:`;

  const answer = await ollamaQueue.add(() => generate(prompt));

  res.json({ answer, sources });
});

export default router;
