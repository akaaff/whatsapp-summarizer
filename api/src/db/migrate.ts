import { pool } from './pool';

const schema = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_path VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unlinked',
  linked_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS cached_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id VARCHAR(255) NOT NULL,
  sender VARCHAR(255),
  body TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  wa_message_id VARCHAR(255),
  UNIQUE(user_id, wa_message_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_user_chat_time
  ON cached_messages(user_id, chat_id, timestamp);

CREATE TABLE IF NOT EXISTS message_embeddings (
  message_id UUID PRIMARY KEY REFERENCES cached_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id VARCHAR(255) NOT NULL,
  embedding vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embeddings_user_chat
  ON message_embeddings(user_id, chat_id);

CREATE TABLE IF NOT EXISTS summary_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id VARCHAR(255) NOT NULL,
  date_from TIMESTAMPTZ NOT NULL,
  date_to TIMESTAMPTZ NOT NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('Migrations applied');
  } finally {
    client.release();
  }
}
