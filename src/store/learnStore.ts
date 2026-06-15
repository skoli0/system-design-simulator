import { create } from "zustand";

interface LearnState {
  activeTutorialId: string | null;
  openTutorial: (tutorialId: string) => void;
  closeTutorial: () => void;
}

export const useLearnStore = create<LearnState>((set) => ({
  activeTutorialId: null,
  openTutorial: (tutorialId) => set({ activeTutorialId: tutorialId }),
  closeTutorial: () => set({ activeTutorialId: null }),
}));
