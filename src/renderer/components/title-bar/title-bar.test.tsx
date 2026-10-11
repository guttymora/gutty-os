// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TitleBar } from './title-bar';

const stubBridgeAPI = (platform: NodeJS.Platform) => {
    const api = {
        platform,
        minimizeWindow: vi.fn(),
        toggleMaximizeWindow: vi.fn(),
        closeWindow: vi.fn(),
    };
    vi.stubGlobal('bridgeAPI', api);

    return api;
};

const getControlLabels = () =>
    screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'));

describe('TitleBar', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders the title', () => {
        stubBridgeAPI('darwin');
        render(<TitleBar title="GuttyOS" />);

        expect(screen.getByText('GuttyOS')).toBeInTheDocument();
    });

    it('uses macOS traffic-light order on darwin', () => {
        stubBridgeAPI('darwin');
        render(<TitleBar title="GuttyOS" />);

        expect(screen.getByRole('banner')).toHaveAttribute(
            'data-platform',
            'mac'
        );
        expect(getControlLabels()).toEqual([
            'Close window',
            'Minimize window',
            'Toggle full screen',
        ]);
    });

    it('uses minimize, maximize, close order on other platforms', () => {
        stubBridgeAPI('win32');
        render(<TitleBar title="GuttyOS" />);

        expect(screen.getByRole('banner')).toHaveAttribute(
            'data-platform',
            'default'
        );
        expect(getControlLabels()).toEqual([
            'Minimize window',
            'Maximize window',
            'Close window',
        ]);
    });

    it('calls the window bridge when a control is clicked', async () => {
        const user = userEvent.setup();
        const api = stubBridgeAPI('darwin');
        render(<TitleBar title="GuttyOS" />);

        await user.click(screen.getByRole('button', { name: 'Close window' }));
        await user.click(
            screen.getByRole('button', { name: 'Minimize window' })
        );
        await user.click(
            screen.getByRole('button', { name: 'Toggle full screen' })
        );

        expect(api.closeWindow).toHaveBeenCalledOnce();
        expect(api.minimizeWindow).toHaveBeenCalledOnce();
        expect(api.toggleMaximizeWindow).toHaveBeenCalledOnce();
    });
});
