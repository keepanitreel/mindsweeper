import type { CubePreset } from './types';

export const CUBE_PRESETS = {
  starter: { id: 'starter', label: 'Starter Cube', size: 4, hiddenDepth: 2, mines: 24 },
  standard: { id: 'standard', label: 'Standard Cube', size: 5, hiddenDepth: 2, mines: 50 },
  deep: { id: 'deep', label: 'Deep Cube', size: 5, hiddenDepth: 3, mines: 80 },
} as const satisfies Record<string, CubePreset>;

export type CubePresetValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateCubePreset(preset: CubePreset): CubePresetValidationResult {
  const totalCells = 6 * preset.size * preset.size * (preset.hiddenDepth + 1);
  const minimumSafeZone = 1 + 8 + preset.hiddenDepth;

  if (preset.size < 3 || preset.hiddenDepth < 1 || preset.mines >= totalCells - minimumSafeZone) {
    return { ok: false, error: 'Cube preset must leave room for the first-click safe zone.' };
  }

  return { ok: true };
}
