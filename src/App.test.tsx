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

  it('renders one page-level main landmark', () => {
    render(<App />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveClass('app-shell');
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

  it('switches between Classic and Cube Mode shells', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Classic Mode')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cube mode/i }));

    expect(screen.getByRole('heading', { name: 'Cube Mode' })).toBeInTheDocument();
    expect(screen.getAllByText('Starter Cube').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Difficulty')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^classic$/i }));

    expect(screen.getByText('Classic Mode')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(81);
  });

  it('renders Cube Mode controls and cells', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));

    expect(screen.getByRole('heading', { name: 'Cube Mode' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cube difficulty')).toHaveValue('starter');
    expect(screen.getByRole('button', { name: /rotate left/i })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /covered cube cell/i }).length).toBeGreaterThan(0);
  });

  it('reveals and flags Cube Mode cells', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i }));

    expect(screen.getByText('Playing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /flag mode/i }));
    await user.click(screen.getAllByRole('gridcell', { name: /covered cube cell/i })[0]);

    expect(screen.getByRole('gridcell', { name: /flagged cube cell/i })).toBeInTheDocument();
  });
});
