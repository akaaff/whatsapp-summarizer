import { EventEmitter } from 'events';

export type SseEvent =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done' }
  | { type: 'error'; message: string };

class ProgressRegistry {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  emit(requestId: string, event: SseEvent): void {
    this.emitter.emit(requestId, event);
  }

  subscribe(requestId: string, handler: (event: SseEvent) => void): () => void {
    this.emitter.on(requestId, handler);
    return () => this.emitter.off(requestId, handler);
  }
}

export const progressRegistry = new ProgressRegistry();
