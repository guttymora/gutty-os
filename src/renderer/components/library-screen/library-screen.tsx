import { useMemo, useState } from 'react';

import { AddGameDialog } from '@components/add-game-dialog/add-game-dialog';
import { ButtonHints } from '@components/button-hints/button-hints';
import { GameDetails } from '@components/game-details/game-details';
import { GameList } from '@components/game-list/game-list';
import { PlatformSidebar } from '@components/platform-sidebar/platform-sidebar';
import { CONTROLS } from '@data/controls';
import type { PlatformFilter } from '@data/platforms';
import { useKeyPress } from '@hooks/use-key-press';
import type { Game } from '@shared/game';
import { type LibraryStatus, useLibraryStore } from '@stores/library-store';
import { useUiStore } from '@stores/ui-store';
import { filterGames } from '@utils/games';

import { LAUNCH_ERROR_MESSAGES } from './launch-messages';
import styles from './library-screen.module.css';

const EMPTY_MESSAGES: Record<LibraryStatus, string> = {
    loading: 'Loading games…',
    ready: 'No games yet',
    error: "Couldn't load your games",
};

/**
 * Enter on a focused control other than a game row (e.g. "Add a game")
 * presses that control instead of playing
 */
const isEnterOnOtherControl = ({ key, target }: KeyboardEvent) =>
    key === 'Enter' &&
    target instanceof Element &&
    target.closest('button, a, input, select, textarea') !== null &&
    target.closest('[data-game-id]') === null;

type LibraryScreenProps = {
    games: Game[];
    status?: LibraryStatus;
    /** False while something covers the library (splash, options) */
    isActive?: boolean;
};

export const LibraryScreen = ({
    games,
    status = 'ready',
    isActive = true,
}: LibraryScreenProps) => {
    const [platform, setPlatform] = useState<PlatformFilter>('all');
    const [selectedId, setSelectedId] = useState<string>();
    const openOptions = useUiStore((state) => state.openOptions);
    const isAddGameOpen = useUiStore((state) => state.isAddGameOpen);
    const openAddGame = useUiStore((state) => state.openAddGame);
    const playingId = useLibraryStore((state) => state.playingId);
    const launchGame = useLibraryStore((state) => state.launchGame);
    const [launchError, setLaunchError] = useState<string>();

    const visibleGames = useMemo(
        () => filterGames(games, platform),
        [games, platform]
    );
    // Fall back to the first game when the selection isn't in this platform
    const selectedGame =
        visibleGames.find((game) => game.id === selectedId) ?? visibleGames[0];

    const playingGame = games.find((game) => game.id === playingId);

    const play = async () => {
        if (!selectedGame) {
            return;
        }
        setLaunchError(undefined);
        const result = await launchGame(selectedGame.id);
        if (!result.ok) {
            setLaunchError(LAUNCH_ERROR_MESSAGES[result.reason]);
        }
    };

    // A plays the selected game; nothing reacts while a game is running
    useKeyPress(
        CONTROLS.a.keys,
        () => void play(),
        isActive && !isAddGameOpen && !playingId && selectedGame !== undefined,
        isEnterOnOtherControl
    );

    const select = (id: string) => {
        setLaunchError(undefined);
        setSelectedId(id);
    };

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
                onSelect={select}
                onAddGame={openAddGame}
            />
            {selectedGame ? (
                <GameDetails game={selectedGame} />
            ) : (
                <div aria-hidden="true" />
            )}
            <div className={styles.hints}>
                {launchError && (
                    <p className={styles.error} role="alert">
                        {launchError}
                    </p>
                )}
                <ButtonHints
                    onPress={{
                        a: selectedGame ? () => void play() : undefined,
                        options: openOptions,
                    }}
                />
            </div>
            {playingId && (
                <div className={styles.playing} role="status">
                    <p className={styles.playingTitle}>
                        Playing {playingGame?.title ?? 'a game'}
                    </p>
                    <p className={styles.playingHint}>Quit mGBA to come back</p>
                </div>
            )}
            {isAddGameOpen && (
                <AddGameDialog
                    platform={platform === 'all' ? undefined : platform}
                    onAdded={showAddedGame}
                />
            )}
        </div>
    );
};
