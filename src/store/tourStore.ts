import { create } from 'zustand';

interface TourState {
  active: boolean;
  stepIndex: number;
  start: () => void;
  next: () => void;
  back: () => void;
  end: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  active: false,
  stepIndex: 0,
  start: () => set({ active: true, stepIndex: 0 }),
  next: () => set((s) => ({ stepIndex: s.stepIndex + 1 })),
  back: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
  end: () => set({ active: false, stepIndex: 0 }),
}));
