import { describe, expect, it } from 'vitest';
import { CUBE_PRESETS, validateCubePreset } from './presets';

describe('cube presets', () => {
  it('defines the fixed Cube Mode presets from the design', () => {
    expect(CUBE_PRESETS.starter).toMatchObject({ id: 'starter', label: 'Starter Cube', size: 4, mines: 24 });
    expect(CUBE_PRESETS.standard).toMatchObject({ id: 'standard', label: 'Standard Cube', size: 10, mines: 200 });
    expect(Object.keys(CUBE_PRESETS)).toEqual(['starter', 'standard']);
  });

  it('accepts all fixed Cube Mode presets', () => {
    expect(validateCubePreset(CUBE_PRESETS.starter)).toEqual({ ok: true });
    expect(validateCubePreset(CUBE_PRESETS.standard)).toEqual({ ok: true });
  });

  it('rejects presets that cannot keep a first-click safe zone', () => {
    expect(validateCubePreset({ id: 'bad', label: 'Bad Cube', size: 3, mines: 99 })).toEqual({
      ok: false,
      error: 'Cube preset must leave room for the first-click safe zone.',
    });
  });
});
