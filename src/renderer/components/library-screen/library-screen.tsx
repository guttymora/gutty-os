import { useMemo, useState } from 'react';

import { AddGameDialog } from '@components/add-game-dialog/add-game-dialog';
import { ButtonHints } from '@components/button-hints/button-hints';
import { GameDetails } from '@components/game-details/game-details';
import { GameList } from '@components/game-list/game-list';
import { PlatformSidebar } from '@components/platform-sidebar/platform-sidebar';
import type { PlatformFilter } from '@data/platforms';
import type { Game } from '@shared/game';
import type { LibraryStatus } from '@stores/library-store';
import { useUiStore } from '@stores/ui-store';
import { filterGames } from '@utils/games';

import styles from './library-screen.module.css';

const EMPTY_MESSAGES: Record<LibraryStatus, string> = {
    loading: 'Loading games…',
    ready: 'No games yet',
    error: "Couldn't load your games",
};

type LibraryScreenProps = {
    games: Game[];
    status?: LibraryStatus;
};

export const LibraryScreen = ({
    games,
    status = 'ready',
}: LibraryScreenProps) => {
    const [platform, setPlatform] = useState<PlatformFilter>('all');
    const [selectedId, setSelectedId] = useState<string>();
    const openOptions = useUiStore((state) => state.openOptions);
    const isAddGameOpen = useUiStore((state) => state.isAddGameOpen);
    const openAddGame = useUiStore((state) => state.openAddGame);

    const visibleGames = useMemo(
        () => filterGames(games, platform),
        [games, platform]
    );
    // Fall back to the first game when the selection isn't in this platform
    const selectedGame =
        visibleGames.find((game) => game.id === selectedId) ?? visibleGames[0];

    // Show the new game, switching to "All Games" if it's filtered out
    const showAddedGame = (game: Game) => {
        if (platform !== 'all' && platform !== game.platform) {
            setPlatform('all');
        }
        setSelectedId(game.id);
    };

    return (
        <div className={styles.library}>
            <PlatformSidebar selected={platform} onSelect={setPlatform} />
            <GameList
                games={visibleGames}
                emptyMessage={EMPTY_MESSAGES[status]}
                selectedId={selectedGame?.id}
                onSelect={setSelectedId}
                onAddGame={openAddGame}
            />
            {selectedGame ? (
                <GameDetails game={selectedGame} />
            ) : (
                <div aria-hidden="true" />
            )}
            <div className={styles.hints}>
                <ButtonHints onPress={{ options: openOptions }} />
            </div>
            {isAddGameOpen && (
                <AddGameDialog
                    platform={platform === 'all' ? undefined : platform}
                    onAdded={showAddedGame}
                />
            )}
        </div>
    );
};
