import { type KeyboardEvent, useId, useMemo, useState } from 'react';

import { PLATFORMS } from '@data/platforms';
import { useKeyPress } from '@hooks/use-key-press';
import type { Game } from '@shared/game';
import { useUiStore } from '@stores/ui-store';
import { searchGames } from '@utils/games';

import styles from './search-dialog.module.css';

const CLOSE_KEYS = ['Escape'];

type SearchDialogProps = {
    games: Game[];
    /** Called with the chosen game after the dialog closes */
    onOpen: (game: Game) => void;
};

export const SearchDialog = ({ games, onOpen }: SearchDialogProps) => {
    const closeSearch = useUiStore((state) => state.closeSearch);
    const [query, setQuery] = useState('');
    const inputId = useId();

    const results = useMemo(() => searchGames(games, query), [games, query]);
    const hasQuery = query.trim().length > 0;

    // Escape closes even from the search box
    useKeyPress(CLOSE_KEYS, closeSearch, { allowWhileTyping: true });

    const open = (game: Game) => {
        closeSearch();
        onOpen(game);
    };

    // The search box handles its own Enter; shortcuts ignore typed keys
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (results[0]) {
                open(results[0]);
            }
        }
    };

    return (
        <div className={styles.backdrop} onClick={closeSearch}>
            <section
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="search-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className={styles.header}>
                    <h2 id="search-title" className={styles.title}>
                        Search
                    </h2>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={closeSearch}
                    >
                        Close
                    </button>
                </header>

                <label htmlFor={inputId} className={styles.label}>
                    Game title, any console
                </label>
                <input
                    id={inputId}
                    className={styles.input}
                    type="search"
                    placeholder="Type a title…"
                    autoComplete="off"
                    spellCheck={false}
                    // The dialog only opens to type in it
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                />

                {!hasQuery && (
                    <p className={styles.note}>
                        Searches Game Boy, GB Color and GB Advance at once.
                    </p>
                )}
                {hasQuery && results.length === 0 && (
                    <p className={styles.note} role="status">
                        No games match “{query.trim()}”
                    </p>
                )}
                {results.length > 0 && (
                    <ul className={styles.results} aria-label="Results">
                        {results.map((game, index) => (
                            <li key={game.id}>
                                <button
                                    type="button"
                                    className={styles.result}
                                    data-first={index === 0}
                                    onClick={() => open(game)}
                                >
                                    <span
                                        className={styles.strip}
                                        data-platform={game.platform}
                                        aria-hidden="true"
                                    />
                                    <span className={styles.resultTitle}>
                                        {game.title}
                                    </span>
                                    <span className={styles.badge}>
                                        {PLATFORMS[game.platform].shortLabel}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <p className={styles.hint}>
                    Enter opens the first result · Esc closes
                </p>
            </section>
        </div>
    );
};
