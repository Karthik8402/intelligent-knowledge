import { create } from 'zustand';
import { getUsage } from '../api';

export type UsageData = {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  reset_at: string;
  plan: string;
  status: string;
};

type UsageStore = {
  data: UsageData | null;
  loading: boolean;
  error: string | null;
  fetchUsage: () => Promise<void>;
  decrementRemaining: () => void;
};

export const useUsageStore = create<UsageStore>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  fetchUsage: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getUsage();
      set({ data, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load usage', loading: false });
    }
  },
  decrementRemaining: () => {
    const { data } = get();
    if (data && data.remaining > 0) {
      const used = data.used + 1;
      const remaining = data.remaining - 1;
      const percentage = Math.min(100, Math.floor((used / data.limit) * 100));
      set({
        data: {
          ...data,
          used,
          remaining,
          percentage,
          status: remaining > 0 ? 'active' : 'exhausted'
        }
      });
    }
  }
}));
