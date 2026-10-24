import { type DragEvent, useState } from 'react';

import { PLATFORMS } from '@data/platforms';
import { useKeyPress } from '@hooks/use-key-press';
import type { Game, Platform } from '@shared/game';
import type { ImportFileKind, StagedFile, StageResult } from '@shared/import';
import { useLibraryStore } from '@stores/library-store';
import { useUiStore } from '@stores/ui-store';

import styles from './add-game-dialog.module.css';
import {
    IMPORT_ERROR_MESSAGES,
    IMPORT_WARNING_MESSAGES,
    MULTIPLE_GAMES_MESSAGE,
    STAGE_ERROR_MESSAGES,
} from './import-messages';

type Message = { tone: 'info' | 'error'; text: string };

type StagedResult = Extract<StageResult, { ok: true }>;

type FileSlotProps = {
    label: string;
    placeholder: string;
    file?: StagedFile;
    onChoose: () => void;
    onClear: () => void;
};

const FileSlot = ({
    label,
    placeholder,
    file,
    onChoose,
    onClear,
}: FileSlotProps) => (
    <div className={styles.slot} data-filled={Boolean(file)}>
        <span className={styles.slotLabel}>{label}</span>
        {file ? (
            <div className={styles.file}>
                <span className={styles.fileName}>{file.name}</span>
                {file.platform && (
                    <span className={styles.badge}>
                        {PLATFORMS[file.platform].shortLabel}
                    </span>
                )}
                <button
                    type="button"
                    className={styles.clear}
                    aria-label={`Remove ${label}`}
                    onClick={onClear}
                >
                    ×
                </button>
            </div>
        ) : (
            <div className={styles.file}>
                <span className={styles.placeholder}>{placeholder}</span>
                <button
                    type="button"
                    className={styles.choose}
                    aria-label={`Choose ${label}`}
                    onClick={onChoose}
                >
                    Choose…
                </button>
            </div>
        )}
    </div>
);

const CLOSE_KEYS = ['Escape'];

type AddGameDialogProps = {
    /** Limits the ROM file dialog to one platform */
    platform?: Platform;
    /** Called after a game was added cleanly (the dialog closes) */
    onAdded?: (game: Game) => void;
};

export const AddGameDialog = ({ platform, onAdded }: AddGameDialogProps) => {
    const addGame = useLibraryStore((state) => state.addGame);
    const closeAddGame = useUiStore((state) => state.closeAddGame);
    const [rom, setRom] = useState<StagedFile>();
    const [save, setSave] = useState<StagedFile>();
    const [message, setMessage] = useState<Message>();
    const [isDragOver, setIsDragOver] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Registered while the dialog is open, removed when it closes
    useKeyPress(CLOSE_KEYS, closeAddGame);

    const showStageError = (result: StageResult) => {
        if (!result.ok && result.reason !== 'cancelled') {
            setMessage({
                tone: 'error',
                text: STAGE_ERROR_MESSAGES[result.reason],
            });
        }
    };

    const applyStagedRom = (result: StagedResult, keepSave: boolean) => {
        setRom(result.file);
        // Pick up the save found next to the ROM, unless one was given
        if (!keepSave && result.suggestedSave) {
            setSave(result.suggestedSave);
        }
    };

    const choose = async (kind: ImportFileKind) => {
        setMessage(undefined);
        const result = await window.bridgeAPI.chooseImportFile(
            kind,
            kind === 'rom' ? platform : undefined
        );
        showStageError(result);
        if (result.ok && kind === 'rom') {
            applyStagedRom(result, Boolean(save));
        } else if (result.ok) {
            setSave(result.file);
        }
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(true);
    };

    const handleDrop = async (event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
        setMessage(undefined);
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) {
            return;
        }
        if (files.length > 2) {
            setMessage({ tone: 'error', text: MULTIPLE_GAMES_MESSAGE });
            return;
        }

        const results = await Promise.all(
            files.map((file) => window.bridgeAPI.stageDroppedFile(file))
        );
        const failed = results.find((result) => !result.ok);
        if (failed) {
            showStageError(failed);
            return;
        }
        const staged = results.filter(
            (result): result is StagedResult => result.ok
        );
        const roms = staged.filter((result) => result.file.kind === 'rom');
        const saves = staged.filter((result) => result.file.kind === 'save');
        if (roms.length > 1 || saves.length > 1) {
            setMessage({ tone: 'error', text: MULTIPLE_GAMES_MESSAGE });
            return;
        }

        if (saves[0]) {
            setSave(saves[0].file);
        }
        if (roms[0]) {
            applyStagedRom(roms[0], Boolean(saves[0] ?? save));
        }
    };

    const importGame = async () => {
        // The button is disabled without a ROM or while importing
        if (!rom) {
            return;
        }
        setIsImporting(true);
        setMessage(undefined);
        const result = await window.bridgeAPI.importGame(
            rom.token,
            save?.token
        );
        setIsImporting(false);

        if (result.status === 'error') {
            setMessage({
                tone: 'error',
                text: IMPORT_ERROR_MESSAGES[result.reason],
            });
            return;
        }

        setRom(undefined);
        setSave(undefined);
        if (result.status === 'duplicate') {
            setMessage({
                tone: 'info',
                text: `${result.game.title} is already in your library`,
            });
            return;
        }

        addGame(result.game);
        if (result.warnings.length === 0) {
            closeAddGame();
            onAdded?.(result.game);
            return;
        }
        // Stay open so the user can read what went wrong
        setMessage({
            tone: 'info',
            text: [
                `Added ${result.game.title}`,
                ...result.warnings.map(
                    (warning) => IMPORT_WARNING_MESSAGES[warning]
                ),
            ].join('. '),
        });
    };

    return (
        <div className={styles.backdrop} onClick={closeAddGame}>
            <section
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-game-title"
                data-drag-over={isDragOver}
                onClick={(event) => event.stopPropagation()}
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <header className={styles.header}>
                    <h2 id="add-game-title" className={styles.title}>
                        Add a game
                    </h2>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={closeAddGame}
                    >
                        Close
                    </button>
                </header>
                <p className={styles.hint}>
                    Drop a ROM here, and its save file if you have one.
                </p>

                <FileSlot
                    label="ROM"
                    placeholder=".gb · .gbc · .gba"
                    file={rom}
                    onChoose={() => choose('rom')}
                    onClear={() => setRom(undefined)}
                />
                <FileSlot
                    label="Save (optional)"
                    placeholder=".sav"
                    file={save}
                    onChoose={() => choose('save')}
                    onClear={() => setSave(undefined)}
                />

                <button
                    type="button"
                    className={styles.add}
                    disabled={!rom || isImporting}
                    onClick={importGame}
                >
                    {isImporting ? 'Adding…' : 'Add game'}
                </button>

                {message?.text && (
                    <p
                        className={styles.message}
                        data-tone={message.tone}
                        role="status"
                    >
                        {message.text}
                    </p>
                )}

                <p className={styles.note}>
                    Files are moved into your GuttyOS library.
                </p>
            </section>
        </div>
    );
};
