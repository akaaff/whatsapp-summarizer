import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your server's LAN IP when testing on a physical device
// e.g. 'http://192.168.1.100:3000'
export const API_BASE_URL = 'http://localhost:3000';

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
