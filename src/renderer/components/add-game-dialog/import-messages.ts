import type {
    ImportErrorReason,
    ImportWarning,
    StageErrorReason,
} from '@shared/import';

export const STAGE_ERROR_MESSAGES: Record<StageErrorReason, string> = {
    cancelled: '',
    unsupported: 'Use a .gb, .gbc or .gba ROM, or a .sav save file',
    'too-large': 'That file is too big for a Game Boy game',
    empty: 'That file is empty',
    'not-a-file': "That file can't be read",
};

export const IMPORT_ERROR_MESSAGES: Record<ImportErrorReason, string> = {
    busy: 'Another game is being added. Try again in a moment',
    'file-not-found': 'Choose the files again',
    'library-unavailable': "Your game library isn't available",
    failed: "Couldn't add the game. Your files were left where they were",
};

export const IMPORT_WARNING_MESSAGES: Record<ImportWarning, string> = {
    'original-not-removed': "The original ROM couldn't be deleted",
    'save-original-not-removed': "The original save couldn't be deleted",
    'save-not-imported': "The save file couldn't be added",
    'existing-save-kept': 'A save for this game already existed and was kept',
};

export const MULTIPLE_GAMES_MESSAGE =
    'Add one game at a time: a ROM and, if you have it, its save';
