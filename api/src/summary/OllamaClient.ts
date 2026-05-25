export interface OllamaResponse {
  response: string;
  done: boolean;
}

export async function generate(prompt: string, model?: string): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = model || process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: ollamaModel, prompt, stream: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as OllamaResponse;
  return data.response.trim();
}

export async function embed(text: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });
  if (!res.ok) {
    throw new Error(`Ollama embed error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}
