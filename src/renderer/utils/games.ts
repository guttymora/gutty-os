import type { PlatformFilter } from '@data/platforms';
import type { Game } from '@shared/game';

export const filterGames = (games: Game[], filter: PlatformFilter): Game[] =>
    games
        .filter((game) => filter === 'all' || game.platform === filter)
        .toSorted((a, b) => a.title.localeCompare(b.title));

export const formatPlayTime = (minutes: number): string => {
    if (minutes <= 0) {
        return '--';
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
};
