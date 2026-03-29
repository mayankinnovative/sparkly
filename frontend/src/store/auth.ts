import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Account, Plan, Province, Language } from '@/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  account: Account | null;
  selectedAccountId: string | null;
  province: Province;
  language: Language;
  isAuthenticated: boolean;

  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  setAccount: (account: Account) => void;
  setSelectedAccountId: (id: string | null) => void;
  setProvince: (province: Province) => void;
  setLanguage: (language: Language) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      account: null,
      selectedAccountId: null,
      province: 'QC',
      language: 'en',
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user }),
      setAccount: (account) => set({ account, province: account.province as Province }),
      setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
      setProvince: (province) => set({ province }),
      setLanguage: (language) => set({ language }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          account: null,
          selectedAccountId: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'sparkly-auth' },
  ),
);

// Helper to check plan access
export function hasPlanAccess(currentPlan: Plan | undefined, requiredPlan: Plan): boolean {
  const hierarchy: Record<Plan, number> = { solo: 1, pro: 2, business: 3 };
  if (!currentPlan) return false;
  return hierarchy[currentPlan] >= hierarchy[requiredPlan];
}
