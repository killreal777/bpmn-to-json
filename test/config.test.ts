import { describe, expect, it } from 'vitest';
import {
  getPresetConfig,
  PRESET_NAMES,
  resolveCompressionConfig
} from '../src/config.js';
import { OPTIMIZATION_IDS } from '../src/optimizations/ids.js';

describe('compression config', () => {
  it('provides base and optimized presets', () => {
    expect(PRESET_NAMES).toEqual(['base', 'optimized']);
    expect(getPresetConfig('base').optimizations).toMatchObject({
      enabled: []
    });
    expect(getPresetConfig('base').output?.pretty).toBe(true);
    expect(getPresetConfig('optimized').optimizations?.enabled).toEqual([
      OPTIMIZATION_IDS.compactElementMeta,
      OPTIMIZATION_IDS.compactCallMappings,
      OPTIMIZATION_IDS.compactFlows,
      OPTIMIZATION_IDS.compactConditions,
      OPTIMIZATION_IDS.omitRedundantGraphRefs,
      OPTIMIZATION_IDS.omitTopLevelMetadata,
      OPTIMIZATION_IDS.stripNamespacePrefixes
    ]);
  });

  it('defaults to the base preset', () => {
    expect(resolveCompressionConfig()).toEqual(getPresetConfig('base'));
  });

  it('extends a preset and applies overrides', () => {
    const config = resolveCompressionConfig({
      extends: 'optimized',
      optimizations: { enabled: [OPTIMIZATION_IDS.compactFlows] },
      output: { pretty: false },
      fields: { exclude: ['collaborations'] }
    });

    expect(config.optimizations?.enabled).toEqual([OPTIMIZATION_IDS.compactFlows]);
    expect(config.output?.pretty).toBe(false);
    expect(config.fields?.exclude).toEqual(['collaborations']);
  });

  it('rejects unknown optimization ids', () => {
    expect(() => resolveCompressionConfig({
      extends: 'optimized',
      optimizations: { enabled: ['notARealOptimization'] }
    })).toThrow('Unknown optimization id: notARealOptimization');
  });

  it('rejects unknown presets', () => {
    expect(() => getPresetConfig('tiny')).toThrow('Unknown compression preset');
    expect(() => resolveCompressionConfig({ extends: 'tiny' })).toThrow('Unknown compression preset');
    expect(() => getPresetConfig('max')).toThrow('Unknown compression preset');
  });

  it('rejects non-object config values', () => {
    expect(() => resolveCompressionConfig('optimized')).toThrow('Compression config must be an object');
    expect(() => resolveCompressionConfig(null)).toThrow('Compression config must be an object');
  });
});
