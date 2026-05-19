type Task<T> = () => Promise<T>;

// Ensures only one Ollama request runs at a time to avoid OOM on low-end hardware
class RequestQueue {
  private running = false;
  private queue: Array<() => void> = [];

  async add<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (err) {
          reject(err);
        } finally {
          this.running = false;
          this.next();
        }
      });
      this.next();
    });
  }

  private next(): void {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const task = this.queue.shift()!;
    task();
  }
}

export const ollamaQueue = new RequestQueue();
