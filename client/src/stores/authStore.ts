import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateAvatar: (avatarColor: string, avatarEmoji: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })(),
  token: localStorage.getItem('token'),

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  updateAvatar: (avatarColor, avatarEmoji) => {
    set(state => {
      if (!state.user) return {};
      const user = { ...state.user, avatarColor, avatarEmoji };
      localStorage.setItem('user', JSON.stringify(user));
      return { user };
    });
  },
}));
