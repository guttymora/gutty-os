import { create } from 'zustand';

type UiState = {
    isOptionsOpen: boolean;
    openOptions: () => void;
    closeOptions: () => void;
    isAddGameOpen: boolean;
    openAddGame: () => void;
    closeAddGame: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
    isOptionsOpen: false,
    openOptions: () => set({ isOptionsOpen: true }),
    closeOptions: () => set({ isOptionsOpen: false }),
    isAddGameOpen: false,
    openAddGame: () => set({ isAddGameOpen: true }),
    closeAddGame: () => set({ isAddGameOpen: false }),
}));
