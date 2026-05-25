import { generate } from './OllamaClient';
import { chunkMessages, Message } from './chunker';
import { ollamaQueue } from './RequestQueue';

type ProgressCallback = (done: number, total: number) => void;

async function summariseChunk(lines: string[], index: number, total: number): Promise<string> {
  const text = lines.join('\n');
  const prompt =
    `You are summarising part ${index + 1} of ${total} of a WhatsApp chat conversation.\n` +
    `Extract the key topics, decisions, and important information from these messages.\n` +
    `Be concise. Do not include greetings or filler messages.\n\n` +
    `Messages:\n${text}\n\nSummary:`;

  return ollamaQueue.add(() => generate(prompt));
}

async function reduceSummaries(
  chunkSummaries: string[],
  language: string
): Promise<string> {
  const combined = chunkSummaries
    .map((s, i) => `Part ${i + 1}:\n${s}`)
    .join('\n\n');

  const prompt =
    `You are combining partial summaries of a WhatsApp conversation into a single coherent summary.\n` +
    `Write a clear, concise final summary covering the main topics, decisions, and key points.\n` +
    `Respond entirely in ${language}.\n\n` +
    `Partial summaries:\n${combined}\n\nFinal summary:`;

  return ollamaQueue.add(() => generate(prompt));
}

export async function runPipeline(
  messages: Message[],
  language: string,
  onProgress?: ProgressCallback
): Promise<string> {
  if (messages.length === 0) {
    throw new Error('No messages found in the selected date range');
  }

  const chunks = chunkMessages(messages);

  // Single chunk: summarise directly in the target language
  if (chunks.length === 1) {
    const text = chunks[0].join('\n');
    const prompt =
      `Summarise this WhatsApp conversation clearly and concisely.\n` +
      `Cover the main topics, decisions, and key information.\n` +
      `Respond entirely in ${language}.\n\n` +
      `Messages:\n${text}\n\nSummary:`;
    onProgress?.(0, 1);
    const result = await ollamaQueue.add(() => generate(prompt));
    onProgress?.(1, 1);
    return result;
  }

  // Multiple chunks: map then reduce, emit progress as each chunk completes
  let done = 0;
  const chunkSummaries = await Promise.all(
    chunks.map((chunk, i) =>
      summariseChunk(chunk, i, chunks.length).then((summary) => {
        onProgress?.(++done, chunks.length);
        return summary;
      })
    )
  );

  return reduceSummaries(chunkSummaries, language);
}
