import type { Difficulty } from './types';

export const DIFFICULTY_PRESETS = {
  easy: { id: 'easy', label: 'Easy', width: 9, height: 9, mines: 10, isCustom: false },
  medium: { id: 'medium', label: 'Medium', width: 16, height: 16, mines: 40, isCustom: false },
  expert: { id: 'expert', label: 'Expert', width: 30, height: 16, mines: 99, isCustom: false },
} as const satisfies Record<string, Difficulty>;

export const CUSTOM_LIMITS = {
  minWidth: 5,
  maxWidth: 30,
  minHeight: 5,
  maxHeight: 24,
  firstClickSafeCells: 9,
};

export type CustomDifficultyInput = Pick<Difficulty, 'width' | 'height' | 'mines'>;

export type CustomDifficultyResult =
  | { ok: true; value: Difficulty }
  | { ok: false; error: string };

export function validateCustomDifficulty(input: CustomDifficultyInput): CustomDifficultyResult {
  const width = Math.floor(input.width);
  const height = Math.floor(input.height);
  const mines = Math.floor(input.mines);

  if (width < CUSTOM_LIMITS.minWidth || width > CUSTOM_LIMITS.maxWidth) {
    return { ok: false, error: `Width must be between ${CUSTOM_LIMITS.minWidth} and ${CUSTOM_LIMITS.maxWidth}.` };
  }

  if (height < CUSTOM_LIMITS.minHeight || height > CUSTOM_LIMITS.maxHeight) {
    return { ok: false, error: `Height must be between ${CUSTOM_LIMITS.minHeight} and ${CUSTOM_LIMITS.maxHeight}.` };
  }

  const maxMines = width * height - CUSTOM_LIMITS.firstClickSafeCells;
  if (mines < 1) {
    return { ok: false, error: 'Mines must be at least 1.' };
  }

  if (mines > maxMines) {
    return { ok: false, error: `Mines must leave at least ${CUSTOM_LIMITS.firstClickSafeCells} safe cells.` };
  }

  return {
    ok: true,
    value: {
      id: 'custom',
      label: 'Custom',
      width,
      height,
      mines,
      isCustom: true,
    },
  };
}
