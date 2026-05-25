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

// Split text at sentence boundaries, keeping each part under maxChars.
// Falls back to word boundary, then hard cut, if no sentence end is found.
function splitAtSentences(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const parts: string[] = [];
  let start = 0;

  while (start < text.length) {
    if (text.length - start <= maxChars) {
      parts.push(text.slice(start));
      break;
    }

    const window = text.slice(start, start + maxChars);

    // Find the last sentence-ending position within the window:
    // ., !, or ? optionally followed by a closing quote/paren/angle, then whitespace.
    const re = /[.!?][)"'»]?\s+/g;
    let lastBoundary = -1;
    let m: RegExpExecArray | null;
    while ((m = re.exec(window)) !== null) {
      lastBoundary = m.index + m[0].length;
    }

    if (lastBoundary > 0) {
      parts.push(text.slice(start, start + lastBoundary).trimEnd());
      start += lastBoundary;
    } else {
      // No sentence boundary — fall back to last word boundary
      const spaceIdx = window.lastIndexOf(' ');
      if (spaceIdx > 0) {
        parts.push(text.slice(start, start + spaceIdx));
        start += spaceIdx + 1;
      } else {
        parts.push(window);
        start += maxChars;
      }
    }

    // Skip any leading whitespace at the new start position
    while (start < text.length && text[start] === ' ') start++;
  }

  return parts.filter(p => p.length > 0);
}

export function chunkMessages(messages: Message[]): string[][] {
  // Expand messages whose formatted line exceeds CHUNK_CHAR_LIMIT into
  // sentence-split sub-lines, each sharing the original timestamp/sender prefix.
  const lines: string[] = [];
  for (const msg of messages) {
    const formatted = formatMessage(msg);
    if (formatted.length <= CHUNK_CHAR_LIMIT) {
      lines.push(formatted);
      continue;
    }
    const time = new Date(msg.timestamp).toISOString().slice(0, 16).replace('T', ' ');
    const prefix = `[${time}] ${msg.sender}: `;
    const maxBody = Math.max(CHUNK_CHAR_LIMIT - prefix.length, 500);
    for (const part of splitAtSentences(msg.body, maxBody)) {
      lines.push(prefix + part);
    }
  }

  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const line of lines) {
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
