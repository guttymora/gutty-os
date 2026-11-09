import type { PlatformFilter } from '@data/platforms';
import type { Game } from '@shared/game';

export const filterGames = (games: Game[], filter: PlatformFilter): Game[] =>
    games
        .filter((game) => filter === 'all' || game.platform === filter)
        .toSorted((a, b) => a.title.localeCompare(b.title));

/** Lowercase without accents, so "pokemon" matches "Pokémon" */
const toSearchText = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

/**
 * Games on any platform whose title contains every word of `query`, ignoring
 * case and accents, sorted by title. A blank query matches nothing.
 */
export const searchGames = (games: Game[], query: string): Game[] => {
    const words = toSearchText(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return [];
    }

    return filterGames(games, 'all').filter((game) => {
        const title = toSearchText(game.title);
        return words.every((word) => title.includes(word));
    });
};

export const formatPlayTime = (minutes: number): string => {
    if (minutes <= 0) {
        return '--';
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
};
