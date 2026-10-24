/**
 * Where the game library lives, for display only (e.g. "~/gutty-os"). The
 * renderer never sends folder paths back: a chosen folder is a token.
 */
export type LibraryLocation = {
    displayPath: string;
};

export type ChooseFolderErrorReason =
    | 'cancelled'
    | 'not-a-folder'
    /** The folder has files in it; only empty folders are allowed */
    | 'not-empty'
    | 'same-folder'
    /** The folder is inside the current library */
    | 'inside-library'
    /** The folder contains the current library */
    | 'contains-library';

export type ChooseFolderResult =
    | { ok: true; token: string; displayPath: string }
    | { ok: false; reason: ChooseFolderErrorReason };

export type MoveLibraryProgress = {
    done: number;
    total: number;
};

export type MoveLibraryErrorReason =
    | 'busy'
    | 'folder-not-found'
    | 'not-empty'
    | 'library-unavailable'
    /** Nothing was moved */
    | 'failed'
    /** The files were moved but the new library couldn't be opened */
    | 'reload-failed';

export type MoveLibraryResult =
    | {
          ok: true;
          location: LibraryLocation;
          /** Some old files couldn't be deleted after the move */
          oldFilesLeft: boolean;
      }
    | { ok: false; reason: MoveLibraryErrorReason };
