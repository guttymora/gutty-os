export type PaletteId = 'escarcha' | 'sorbete' | 'pocket' | 'algodon';

/** Each key is applied as a CSS variable: buttonAFill -> --color-button-a-fill */
export type PaletteColors = {
    paper: string;
    surface: string;
    grid: string;
    line: string;
    ink: string;
    inkMuted: string;
    inkFaint: string;
    star: string;
    starEmpty: string;
    /** Button letters (deeper tone, readable on paper) */
    buttonA: string;
    buttonB: string;
    buttonX: string;
    buttonY: string;
    /** Button circle fills (pastel) */
    buttonAFill: string;
    buttonBFill: string;
    buttonXFill: string;
    buttonYFill: string;
    platformGb: string;
    platformGbc: string;
    platformGba: string;
    /** Handheld icons */
    deviceBezel: string;
    deviceGbBody: string;
    deviceGbScreen: string;
    deviceGbButtons: string;
    deviceGbcBody: string;
    deviceGbcScreen: string;
    deviceGbcButtons: string;
    deviceGbaBody: string;
    deviceGbaScreen: string;
    deviceGbaButtons: string;
};

export type Palette = {
    id: PaletteId;
    name: string;
    colors: PaletteColors;
};

export const DEFAULT_PALETTE_ID: PaletteId = 'escarcha';

export const PALETTES: Palette[] = [
    {
        id: 'escarcha',
        name: 'Escarcha',
        colors: {
            paper: '#fbfcfe',
            surface: '#eef2f8',
            grid: '#e1e7f0',
            line: '#2a3040',
            ink: '#222838',
            inkMuted: '#667085',
            inkFaint: '#a9b2c3',
            star: '#fbd85c',
            starEmpty: '#d3dae6',
            buttonA: '#c94a63',
            buttonB: '#b07f1d',
            buttonX: '#3c6cbf',
            buttonY: '#2f8a63',
            buttonAFill: '#f6b3bf',
            buttonBFill: '#f8dca6',
            buttonXFill: '#b3cdf6',
            buttonYFill: '#b5e3cc',
            platformGb: '#c3d49b',
            platformGbc: '#cdb8f0',
            platformGba: '#aebaf0',
            deviceBezel: '#3a3d48',
            deviceGbBody: '#dcdcd6',
            deviceGbScreen: '#b4cf6a',
            deviceGbButtons: '#c9739a',
            deviceGbcBody: '#b99be6',
            deviceGbcScreen: '#c4ecf2',
            deviceGbcButtons: '#3a3550',
            deviceGbaBody: '#9ea8ea',
            deviceGbaScreen: '#dce7ff',
            deviceGbaButtons: '#ecebe6',
        },
    },
    {
        id: 'sorbete',
        name: 'Sorbete',
        colors: {
            paper: '#fffaf6',
            surface: '#fbefe8',
            grid: '#f3e4da',
            line: '#3b2f36',
            ink: '#30262c',
            inkMuted: '#7d6c72',
            inkFaint: '#c2b0b3',
            star: '#ffcf66',
            starEmpty: '#ead9cf',
            buttonA: '#c95a42',
            buttonB: '#b27a1e',
            buttonX: '#3e70b0',
            buttonY: '#3f8a4c',
            buttonAFill: '#ffb4a2',
            buttonBFill: '#ffd8a1',
            buttonXFill: '#b8d4f2',
            buttonYFill: '#c2e5c2',
            platformGb: '#d6dca0',
            platformGbc: '#dcbde9',
            platformGba: '#bcc3ee',
            deviceBezel: '#3a3d48',
            deviceGbBody: '#e9e2dc',
            deviceGbScreen: '#c3d683',
            deviceGbButtons: '#d98c8c',
            deviceGbcBody: '#cfa5e3',
            deviceGbcScreen: '#d4efeb',
            deviceGbcButtons: '#3b2f36',
            deviceGbaBody: '#aab2ea',
            deviceGbaScreen: '#e2e9fb',
            deviceGbaButtons: '#f4ece6',
        },
    },
    {
        id: 'pocket',
        name: 'Pocket',
        colors: {
            paper: '#f8faf3',
            surface: '#edf2e3',
            grid: '#e1e8d4',
            line: '#2f3a2c',
            ink: '#263022',
            inkMuted: '#66705f',
            inkFaint: '#a9b39c',
            star: '#f2d36b',
            starEmpty: '#d6dcc9',
            buttonA: '#b9554a',
            buttonB: '#9c7420',
            buttonX: '#3f689e',
            buttonY: '#3f7f3a',
            buttonAFill: '#eeb0a8',
            buttonBFill: '#efd49c',
            buttonXFill: '#a9c4e4',
            buttonYFill: '#b6d9a8',
            platformGb: '#bccb85',
            platformGbc: '#c7b2e2',
            platformGba: '#a9b1e0',
            deviceBezel: '#3a3d48',
            deviceGbBody: '#d8d8cc',
            deviceGbScreen: '#a9c45c',
            deviceGbButtons: '#b8728f',
            deviceGbcBody: '#b49ad9',
            deviceGbcScreen: '#cfe8e0',
            deviceGbcButtons: '#2f3a2c',
            deviceGbaBody: '#9aa3dc',
            deviceGbaScreen: '#dde5f6',
            deviceGbaButtons: '#e9eadf',
        },
    },
    {
        id: 'algodon',
        name: 'Algodón de azúcar',
        colors: {
            paper: '#fffdfc',
            surface: '#f8f1f4',
            grid: '#f0e5ea',
            line: '#3a3240',
            ink: '#2e2733',
            inkMuted: '#7a6f80',
            inkFaint: '#bcaebf',
            star: '#ffd97a',
            starEmpty: '#e6d9e0',
            buttonA: '#d14d73',
            buttonB: '#b8801c',
            buttonX: '#4a63c9',
            buttonY: '#2f9273',
            buttonAFill: '#ffadc1',
            buttonBFill: '#ffe0a8',
            buttonXFill: '#b9c8ff',
            buttonYFill: '#b8ecd9',
            platformGb: '#d3e3a6',
            platformGbc: '#e2c2f7',
            platformGba: '#c3c6fb',
            deviceBezel: '#3a3d48',
            deviceGbBody: '#e6e1df',
            deviceGbScreen: '#bfdc86',
            deviceGbButtons: '#e08bb0',
            deviceGbcBody: '#d5a8f2',
            deviceGbcScreen: '#ccf1ec',
            deviceGbcButtons: '#3a3240',
            deviceGbaBody: '#b5b2f5',
            deviceGbaScreen: '#e3e9ff',
            deviceGbaButtons: '#f3eef0',
        },
    },
];

export const getPalette = (id: PaletteId): Palette =>
    PALETTES.find((palette) => palette.id === id) ??
    (PALETTES.find((palette) => palette.id === DEFAULT_PALETTE_ID) as Palette);

/** paletteKey -> --color-palette-key */
export const toCssVariable = (key: string) =>
    `--color-${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;

export const applyPalette = (
    id: PaletteId,
    root: HTMLElement = document.documentElement
) => {
    const { colors } = getPalette(id);
    for (const [key, value] of Object.entries(colors)) {
        root.style.setProperty(toCssVariable(key), value);
    }
    root.dataset.palette = id;
};
