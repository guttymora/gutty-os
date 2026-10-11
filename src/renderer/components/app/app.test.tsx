// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';

describe('App', () => {
    beforeEach(() => {
        vi.stubGlobal('bridgeAPI', {
            platform: 'darwin',
            minimizeWindow: vi.fn(),
            toggleMaximizeWindow: vi.fn(),
            closeWindow: vi.fn(),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders the GuttyOS title', () => {
        render(<App />);

        expect(
            screen.getByRole('heading', { name: 'GuttyOS' })
        ).toBeInTheDocument();
    });
});
