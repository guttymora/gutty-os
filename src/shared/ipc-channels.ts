/** Requests from the renderer, each handled by the main process */
export enum IpcChannels {
    WINDOW_MINIMIZE = 'window:minimize',
    WINDOW_TOGGLE_MAXIMIZE = 'window:toggle-maximize',
    WINDOW_CLOSE = 'window:close',
    LIBRARY_GET_GAMES = 'library:get-games',
    LIBRARY_GET_LOCATION = 'library:get-location',
    LIBRARY_CHOOSE_FOLDER = 'library:choose-folder',
    LIBRARY_MOVE = 'library:move',
    IMPORT_STAGE_FILE = 'import:stage-file',
    IMPORT_CHOOSE_FILE = 'import:choose-file',
    IMPORT_GAME = 'import:game',
}

/** Messages the main process sends to the renderer */
export enum IpcEvents {
    LIBRARY_MOVE_PROGRESS = 'library:move-progress',
}
