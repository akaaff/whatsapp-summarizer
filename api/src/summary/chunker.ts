export interface Message {
  sender: string;
  body: string;
  timestamp: Date;
}

// ~4 chars per token is a conservative estimate for mixed-language text
const CHARS_PER_TOKEN = 4;
const CHUNK_TOKEN_LIMIT = 4000;
const OVERLAP_TOKEN_SIZE = 200;

const CHUNK_CHAR_LIMIT = CHUNK_TOKEN_LIMIT * CHARS_PER_TOKEN;
const OVERLAP_CHAR_SIZE = OVERLAP_TOKEN_SIZE * CHARS_PER_TOKEN;

export function formatMessage(msg: Message): string {
  const time = new Date(msg.timestamp).toISOString().slice(0, 16).replace('T', ' ');
  return `[${time}] ${msg.sender}: ${msg.body}`;
}

export function chunkMessages(messages: Message[]): string[][] {
  const lines = messages.map(formatMessage);
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const line of lines) {
    // If adding this line exceeds the limit, save current chunk and start a new one with overlap
    if (currentChars + line.length > CHUNK_CHAR_LIMIT && current.length > 0) {
      chunks.push(current);

      // Carry over the last N chars worth of lines as overlap
      const overlap: string[] = [];
      let overlapChars = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        overlapChars += current[i].length;
        if (overlapChars > OVERLAP_CHAR_SIZE) break;
        overlap.unshift(current[i]);
      }

      current = overlap;
      currentChars = overlap.reduce((sum, l) => sum + l.length, 0);
    }

    current.push(line);
    currentChars += line.length;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function estimateTokens(messages: Message[]): number {
  const totalChars = messages.reduce((sum, m) => sum + m.body.length + m.sender.length + 30, 0);
  return Math.ceil(totalChars / CHARS_PER_TOKEN);
}
