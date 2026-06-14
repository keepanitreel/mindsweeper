import { describe, expect, it } from 'vitest';
import { CUBE_PRESETS, validateCubePreset } from './presets';

describe('cube presets', () => {
  it('defines the fixed Cube Mode presets from the design', () => {
    expect(CUBE_PRESETS.starter).toMatchObject({ id: 'starter', label: 'Starter Cube', size: 4, hiddenDepth: 2, mines: 24 });
    expect(CUBE_PRESETS.standard).toMatchObject({ id: 'standard', label: 'Standard Cube', size: 5, hiddenDepth: 2, mines: 50 });
    expect(CUBE_PRESETS.deep).toMatchObject({ id: 'deep', label: 'Deep Cube', size: 5, hiddenDepth: 3, mines: 80 });
  });

  it('rejects presets that cannot keep a first-click safe zone', () => {
    expect(validateCubePreset({ id: 'starter', label: 'Starter Cube', size: 4, hiddenDepth: 2, mines: 24 })).toEqual({ ok: true });
    expect(validateCubePreset({ id: 'bad', label: 'Bad Cube', size: 2, hiddenDepth: 1, mines: 20 })).toEqual({
      ok: false,
      error: 'Cube preset must leave room for the first-click safe zone.',
    });
  });
});
