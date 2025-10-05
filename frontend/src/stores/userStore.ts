import { create } from 'zustand';
import type { UserState } from '../types';

interface UserStore extends UserState {
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
}

const useUserStore = create<UserStore>((set) => ({
  address: null,
  isConnected: false,
  isOrganizer: false,
  isAdmin: false,
  balance: 0n,
  tickets: [],

  setUser: (user) => set((state) => ({ ...state, ...user })),
  clearUser: () => set({
    address: null,
    isConnected: false,
    isOrganizer: false,
    isAdmin: false,
    balance: 0n,
    tickets: [],
  }),
}));

export default useUserStore;
