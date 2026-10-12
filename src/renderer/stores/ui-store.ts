import { create } from 'zustand';

type UiState = {
    isOptionsOpen: boolean;
    openOptions: () => void;
    closeOptions: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
    isOptionsOpen: false,
    openOptions: () => set({ isOptionsOpen: true }),
    closeOptions: () => set({ isOptionsOpen: false }),
}));
