import { describe, expect, it } from 'vitest';
import {
  getPresetConfig,
  PRESET_NAMES,
  resolveCompressionConfig
} from '../src/config.js';

describe('compression config', () => {
  it('provides base and max presets', () => {
    expect(PRESET_NAMES).toEqual(['base', 'max']);
    expect(getPresetConfig('base').optimizations?.compactMappings).toBe(true);
    expect(getPresetConfig('base').optimizations?.compactSameNameMappings).toBe(false);
    expect(getPresetConfig('base').output?.pretty).toBe(true);
    expect(getPresetConfig('max').optimizations).toMatchObject({
      compactMappings: true,
      compactSameNameMappings: true,
      compactServiceTaskImplementation: true,
      compactTypes: true,
      compactFlowRefs: true,
      compactCallActivity: true,
      compactConditions: true,
      omitIncomingOutgoing: true,
      omitDefinitions: true
    });
  });

  it('defaults to the base preset', () => {
    expect(resolveCompressionConfig()).toEqual(getPresetConfig('base'));
  });

  it('extends a preset and applies overrides', () => {
    const config = resolveCompressionConfig({
      extends: 'max',
      optimizations: { compactTypes: false },
      output: { pretty: false },
      fields: { exclude: ['collaborations'] }
    });

    expect(config.optimizations?.compactServiceTaskImplementation).toBe(true);
    expect(config.optimizations?.compactTypes).toBe(false);
    expect(config.output?.pretty).toBe(false);
    expect(config.fields?.exclude).toEqual(['collaborations']);
  });

  it('rejects unknown presets', () => {
    expect(() => getPresetConfig('tiny')).toThrow('Unknown compression preset');
    expect(() => resolveCompressionConfig({ extends: 'tiny' })).toThrow('Unknown compression preset');
  });

  it('rejects non-object config values', () => {
    expect(() => resolveCompressionConfig('max')).toThrow('Compression config must be an object');
    expect(() => resolveCompressionConfig(null)).toThrow('Compression config must be an object');
  });
});
