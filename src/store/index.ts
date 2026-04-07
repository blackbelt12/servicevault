import { create } from "zustand";

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: "clients",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
