import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  roles: string[];
}

interface StoreState {
  user: User | null;
  accessToken: string | null;
  theme: 'light' | 'dark';
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  accessToken: null,
  theme: 'dark',
  setAuth: (user, token) => set({ user, accessToken: token }),
  clearAuth: () => set({ user: null, accessToken: null }),
  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: nextTheme });
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(nextTheme);
  },
  initTheme: () => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(get().theme);
  }
}));
