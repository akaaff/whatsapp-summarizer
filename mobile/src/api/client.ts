import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Web served from API (production): EXPO_PUBLIC_API_URL is unset → empty base = same origin.
// Web dev server (localhost:8081): set EXPO_PUBLIC_API_URL=http://localhost:3000 in mobile/.env.
// Native: set EXPO_PUBLIC_API_URL to your server's LAN IP in mobile/.env.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' ? '' : 'http://localhost:3000');

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (email: string, password: string) =>
  client.post('/auth/register', { email, password });

export const login = (email: string, password: string) =>
  client.post('/auth/login', { email, password });

// WhatsApp
export const getQR = () => client.get('/whatsapp/qr');
export const getStatus = () => client.get('/whatsapp/status');
export const getChats = () => client.get('/whatsapp/chats');
export const getMessages = (chatId: string, from: string, to: string) =>
  client.get(`/whatsapp/chats/${encodeURIComponent(chatId)}/messages`, {
    params: { from, to },
  });

// Summaries
export const requestSummary = (
  chat_id: string,
  date_from: string,
  date_to: string,
  language: string
) => client.post('/summaries', { chat_id, date_from, date_to, language });

export const getSummary = (id: string) => client.get(`/summaries/${id}`);
export const listSummaries = () => client.get('/summaries');

// Search
export const searchMessages = (chat_id: string, query: string) =>
  client.post('/search', { chat_id, query });

export type SseProgressEvent =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function subscribeProgress(
  requestId: string,
  onEvent: (event: SseProgressEvent) => void,
): () => void {
  const ctrl = new AbortController();

  (async () => {
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      if (ctrl.signal.aborted) return;

      const res = await fetch(`${API_BASE_URL}/summaries/${requestId}/progress`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          Accept: 'text/event-stream',
        },
        signal: ctrl.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!ctrl.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { onEvent(JSON.parse(line.slice(6))); } catch {}
          }
        }
      }
    } catch {
      // Abort or network error — ignore
    }
  })();

  return () => ctrl.abort();
}
