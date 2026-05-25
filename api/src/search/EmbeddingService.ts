import { pool } from '../db/pool';
import { embed } from '../summary/OllamaClient';
import { ollamaQueue } from '../summary/RequestQueue';
import { formatMessage } from '../summary/chunker';

// Embed all messages for a user+chat that don't yet have an embedding.
// Called lazily at search time so message caching stays fast.
export async function embedPendingMessages(userId: string, chatId: string): Promise<void> {
  const { rows } = await pool.query<{
    id: string; sender: string; body: string; timestamp: Date;
  }>(
    `SELECT cm.id, cm.sender, cm.body, cm.timestamp
     FROM cached_messages cm
     LEFT JOIN message_embeddings me ON me.message_id = cm.id
     WHERE cm.user_id = $1 AND cm.chat_id = $2 AND me.message_id IS NULL
     ORDER BY cm.timestamp ASC`,
    [userId, chatId]
  );

  for (const row of rows) {
    const text = formatMessage({ sender: row.sender, body: row.body, timestamp: row.timestamp });
    const vector = await ollamaQueue.add(() => embed(text));
    await pool.query(
      `INSERT INTO message_embeddings (message_id, user_id, chat_id, embedding)
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT DO NOTHING`,
      [row.id, userId, chatId, JSON.stringify(vector)]
    );
  }
}
