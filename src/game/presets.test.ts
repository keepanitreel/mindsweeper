import { describe, expect, it } from 'vitest';
import { DIFFICULTY_PRESETS, validateCustomDifficulty } from './presets';

describe('difficulty presets', () => {
  it('matches classic Minesweeper dimensions', () => {
    expect(DIFFICULTY_PRESETS.easy).toEqual({
      id: 'easy',
      label: 'Easy',
      width: 9,
      height: 9,
      mines: 10,
      isCustom: false,
    });
    expect(DIFFICULTY_PRESETS.medium).toMatchObject({ width: 16, height: 16, mines: 40 });
    expect(DIFFICULTY_PRESETS.expert).toMatchObject({ width: 30, height: 16, mines: 99 });
  });

  it('accepts safe custom dimensions', () => {
    expect(validateCustomDifficulty({ width: 12, height: 10, mines: 20 })).toEqual({
      ok: true,
      value: {
        id: 'custom',
        label: 'Custom',
        width: 12,
        height: 10,
        mines: 20,
        isCustom: true,
      },
    });
  });

  it('rejects invalid custom dimensions and mine counts', () => {
    expect(validateCustomDifficulty({ width: 3, height: 9, mines: 4 })).toEqual({
      ok: false,
      error: 'Width must be between 5 and 30.',
    });
    expect(validateCustomDifficulty({ width: 9, height: 4, mines: 4 })).toEqual({
      ok: false,
      error: 'Height must be between 5 and 24.',
    });
    expect(validateCustomDifficulty({ width: 9, height: 9, mines: 80 })).toEqual({
      ok: false,
      error: 'Mines must leave at least 9 safe cells.',
    });
  });
});
