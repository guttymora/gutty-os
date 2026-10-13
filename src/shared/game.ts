/** Platforms supported by mGBA */
export const PLATFORM_IDS = ['gb', 'gbc', 'gba'] as const;

export type Platform = (typeof PLATFORM_IDS)[number];

/**
 * A game as the renderer sees it. File paths never leave the main process:
 * the renderer identifies games by `id` only.
 */
export type Game = {
    /** SHA-1 of the ROM file */
    id: string;
    title: string;
    platform: Platform;
    /** App URL for the cover image, once covers are supported */
    coverUrl?: string;
    releaseYear?: number;
    publisher?: string;
    description?: string;
    /** 0 to 5 stars */
    rating: number;
    playTimeMinutes: number;
    isFavorite: boolean;
    /** ISO 8601 timestamp */
    addedAt: string;
    /** ISO 8601 timestamp */
    lastPlayedAt?: string;
};
