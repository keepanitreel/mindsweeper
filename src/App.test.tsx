import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

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
});
