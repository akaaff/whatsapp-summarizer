import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  setAuth: (token: string, user: { id: string; email: string }) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync('jwt_token', token);
    await SecureStore.setItemAsync('user_id', user.id);
    await SecureStore.setItemAsync('user_email', user.email);
    set({ token, userId: user.id, email: user.email });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('user_id');
    await SecureStore.deleteItemAsync('user_email');
    set({ token: null, userId: null, email: null });
  },

  loadAuth: async () => {
    const token = await SecureStore.getItemAsync('jwt_token');
    const userId = await SecureStore.getItemAsync('user_id');
    const email = await SecureStore.getItemAsync('user_email');
    if (token && userId && email) set({ token, userId, email });
  },
}));
