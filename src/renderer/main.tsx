import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@components/app/app';
import { applyPalette } from '@data/palettes';
import { useThemeStore } from '@stores/theme-store';

import '@fontsource-variable/pixelify-sans';
import '@styles/theme.css';
import '@styles/global.css';

// Apply the saved palette before the first paint, then follow changes
applyPalette(useThemeStore.getState().paletteId);
useThemeStore.subscribe(({ paletteId }) => applyPalette(paletteId));

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);
