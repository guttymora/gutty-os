import { useEffect, useState } from 'react';

import type {
    ChooseFolderErrorReason,
    MoveLibraryErrorReason,
    MoveLibraryProgress,
    MoveLibraryResult,
} from '@shared/library-location';
import { useLibraryStore } from '@stores/library-store';

import styles from './library-folder-setting.module.css';

const CHOOSE_ERROR_MESSAGES: Record<ChooseFolderErrorReason, string> = {
    cancelled: '',
    'not-a-folder': "That folder can't be used",
    'not-empty': 'Choose an empty folder',
    'same-folder': 'Your library is already in that folder',
    'inside-library': 'Choose a folder outside your current library',
    'contains-library':
        'That folder contains your current library. Choose an empty folder',
};

const MOVE_ERROR_MESSAGES: Record<MoveLibraryErrorReason, string> = {
    busy: 'A game is being added. Try again in a moment',
    'folder-not-found': 'Choose the folder again',
    'not-empty': 'That folder is no longer empty. Choose an empty folder',
    'library-unavailable': "Your game library isn't available",
    failed: "Couldn't move your library. Nothing was changed",
    'reload-failed':
        "Your library was moved but couldn't be opened. Restart GuttyOS",
};

type Step =
    | { kind: 'idle'; message?: { tone: 'info' | 'error'; text: string } }
    | { kind: 'confirm'; token: string; displayPath: string }
    | { kind: 'moving'; displayPath: string; progress?: MoveLibraryProgress };

type LibraryFolderSettingProps = {
    /** Tells the parent a move is running, so it can't be closed */
    onBusyChange?: (busy: boolean) => void;
};

export const LibraryFolderSetting = ({
    onBusyChange,
}: LibraryFolderSettingProps) => {
    const loadGames = useLibraryStore((state) => state.loadGames);
    const [location, setLocation] = useState<string>();
    const [step, setStep] = useState<Step>({ kind: 'idle' });

    useEffect(() => {
        void window.bridgeAPI
            .getLibraryLocation()
            .then((current) => setLocation(current?.displayPath));
    }, []);

    const choose = async () => {
        const result = await window.bridgeAPI.chooseLibraryFolder();
        if (result.ok) {
            setStep({
                kind: 'confirm',
                token: result.token,
                displayPath: result.displayPath,
            });
        } else {
            setStep({
                kind: 'idle',
                message:
                    result.reason === 'cancelled'
                        ? undefined
                        : {
                              tone: 'error',
                              text: CHOOSE_ERROR_MESSAGES[result.reason],
                          },
            });
        }
    };

    const move = async (token: string, displayPath: string) => {
        setStep({ kind: 'moving', displayPath });
        onBusyChange?.(true);
        const stopListening = window.bridgeAPI.onLibraryMoveProgress(
            (progress) => setStep({ kind: 'moving', displayPath, progress })
        );
        let result: MoveLibraryResult;
        try {
            result = await window.bridgeAPI.moveLibrary(token);
        } catch (error) {
            console.error('Could not move the library:', error);
            result = { ok: false, reason: 'failed' };
        } finally {
            stopListening();
            onBusyChange?.(false);
        }

        if (!result.ok) {
            setStep({
                kind: 'idle',
                message: {
                    tone: 'error',
                    text: MOVE_ERROR_MESSAGES[result.reason],
                },
            });
            return;
        }
        setLocation(result.location.displayPath);
        setStep({
            kind: 'idle',
            message: {
                tone: 'info',
                text: result.oldFilesLeft
                    ? `Library moved. Some files couldn't be removed from the old folder`
                    : 'Library moved',
            },
        });
        await loadGames();
    };

    return (
        <section
            className={styles.setting}
            aria-labelledby="library-folder-label"
        >
            <h3 id="library-folder-label" className={styles.title}>
                Library folder
            </h3>

            {step.kind === 'idle' && (
                <>
                    <div className={styles.row}>
                        <span className={styles.path}>{location ?? '…'}</span>
                        <button
                            type="button"
                            className={styles.button}
                            onClick={choose}
                        >
                            Change…
                        </button>
                    </div>
                    {step.message && (
                        <p
                            className={styles.message}
                            data-tone={step.message.tone}
                            role="status"
                        >
                            {step.message.text}
                        </p>
                    )}
                </>
            )}

            {step.kind === 'confirm' && (
                <div className={styles.confirm}>
                    <p>
                        Move your library to{' '}
                        <strong className={styles.path}>
                            {step.displayPath}
                        </strong>
                        ?
                    </p>
                    <p className={styles.note}>
                        Your games, saves and library.json are copied and
                        checked first. The old folder is removed only after
                        that.
                    </p>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.primary}
                            onClick={() => move(step.token, step.displayPath)}
                        >
                            Move my library
                        </button>
                        <button
                            type="button"
                            className={styles.button}
                            onClick={() => setStep({ kind: 'idle' })}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {step.kind === 'moving' && (
                <div className={styles.confirm} role="status">
                    <p>
                        Moving to{' '}
                        <strong className={styles.path}>
                            {step.displayPath}
                        </strong>
                        …
                    </p>
                    <progress
                        className={styles.progress}
                        aria-label="Moving library"
                        max={step.progress?.total || 1}
                        value={step.progress?.done ?? 0}
                    />
                    {step.progress && (
                        <p className={styles.note}>
                            {step.progress.done} of {step.progress.total} files
                        </p>
                    )}
                </div>
            )}
        </section>
    );
};
