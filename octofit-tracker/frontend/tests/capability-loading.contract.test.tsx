import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('capability loading transition', () => {
  it('replaces the activity loading state with API data after a successful response', async () => {
    let resolveResponse!: (response: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.stubGlobal('fetch', vi.fn(() => pendingResponse));

    render(
      <MemoryRouter initialEntries={['/activities']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

    await act(async () => {
      resolveResponse(new Response(
        JSON.stringify({ activities: [{ type: 'run', minutes: 30, points: 30 }] }),
        { status: 200 },
      ));
    });

    expect(screen.getByText(/run/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
