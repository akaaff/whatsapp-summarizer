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

export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}
