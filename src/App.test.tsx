import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Minesweeper app', () => {
  it('renders the Microsoft-style Classic Mode shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Minesweeper' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toHaveValue('easy');
    expect(screen.getByText('Classic Mode')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(81);
  });

  it('reveals and flags cells from the board', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstCell = screen.getAllByRole('gridcell', { name: /covered cell/i })[40];
    await user.click(firstCell);

    expect(screen.getByText(/playing/i)).toBeInTheDocument();

    const flagMode = screen.getByRole('button', { name: /flag mode/i });
    await user.click(flagMode);
    const coveredCell = screen.getAllByRole('gridcell', { name: /covered cell/i })[0];
    await user.click(coveredCell);

    expect(screen.getByRole('gridcell', { name: /flagged cell/i })).toBeInTheDocument();
  });

  it('changes to expert difficulty and creates a 480-cell board', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('Difficulty'), 'expert');

    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(480);
    expect(screen.getByText('099')).toBeInTheDocument();
  });

  it('undoes the mine hit that ended the game', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('gridcell', { name: 'Covered cell row 5 column 5' }));
    await user.click(screen.getByRole('gridcell', { name: 'Covered cell row 1 column 2' }));

    expect(screen.getByText('Game over')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Mine cell row 1 column 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo last move/i }));

    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    expect(screen.getByText('Playing')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Covered cell row 1 column 2' })).toBeInTheDocument();
  });
});
