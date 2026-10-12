/** Platforms supported by mGBA */
export type Platform = 'gb' | 'gbc' | 'gba';

export type Game = {
    id: string;
    title: string;
    platform: Platform;
    /** Absolute path to the ROM file */
    romPath: string;
    /** Absolute path to a local cover image, if one was found */
    coverPath?: string;
    releaseYear?: number;
    publisher?: string;
    description?: string;
    /** 0 to 5 stars */
    rating: number;
    playTimeMinutes: number;
    isFavorite: boolean;
    /** ISO 8601 timestamp */
    lastPlayedAt?: string;
};
