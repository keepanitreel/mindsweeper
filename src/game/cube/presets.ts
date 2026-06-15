import type { CubePreset } from './types';

export const CUBE_PRESETS = {
  starter: { id: 'starter', label: 'Starter Cube', size: 4, mines: 24 },
  standard: { id: 'standard', label: 'Standard Cube', size: 10, mines: 200 },
} as const satisfies Record<string, CubePreset>;

export type CubePresetValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateCubePreset(preset: CubePreset): CubePresetValidationResult {
  const totalCells = 6 * preset.size * preset.size;
  const minimumSafeZone = 1 + 8;

  if (preset.size < 3 || preset.mines >= totalCells - minimumSafeZone) {
    return { ok: false, error: 'Cube preset must leave room for the first-click safe zone.' };
  }

  return { ok: true };
}
