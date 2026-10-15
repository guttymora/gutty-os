import type { Game, Platform } from './game';

export type ImportFileKind = 'rom' | 'save';

/**
 * A file the user picked or dropped, validated by the main process. The
 * renderer only gets a token and the file name, never its path.
 */
export type StagedFile = {
    token: string;
    /** File name only, for display */
    name: string;
    kind: ImportFileKind;
    /** Set for ROMs (from the file extension) */
    platform?: Platform;
};

export type StageErrorReason =
    'cancelled' | 'unsupported' | 'too-large' | 'empty' | 'not-a-file';

export type StageResult =
    | {
          ok: true;
          file: StagedFile;
          /** A save with the same name found next to the ROM */
          suggestedSave?: StagedFile;
      }
    | { ok: false; reason: StageErrorReason };

export type ImportWarning =
    /** The game was added but the original file couldn't be deleted */
    | 'original-not-removed'
    /** The save was added but its original file couldn't be deleted */
    | 'save-original-not-removed'
    /** The save file couldn't be added (the game was) */
    | 'save-not-imported'
    /** A save already existed for this game and was kept */
    | 'existing-save-kept';

export type ImportErrorReason =
    'busy' | 'file-not-found' | 'library-unavailable' | 'failed';

export type ImportResult =
    | { status: 'added'; game: Game; warnings: ImportWarning[] }
    | { status: 'duplicate'; game: Game }
    | { status: 'error'; reason: ImportErrorReason };
