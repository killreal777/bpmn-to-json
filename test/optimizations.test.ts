import { describe, expect, it } from 'vitest';
import { OPTIMIZATION_IDS } from '../src/optimizations/ids.js';
import { applyOptimizations } from '../src/optimizations/pipeline.js';
import { OPTIMIZATION_REGISTRY } from '../src/optimizations/registry.js';

describe('optimization pipeline', () => {
  it('defines the approved optimization ids', () => {
    expect(OPTIMIZATION_IDS).toEqual({
      compactElementMeta: 'compactElementMeta',
      compactCallMappings: 'compactCallMappings',
      compactFlows: 'compactFlows',
      compactConditions: 'compactConditions',
      omitRedundantGraphRefs: 'omitRedundantGraphRefs',
      omitTopLevelMetadata: 'omitTopLevelMetadata'
    });
  });

  it('registers every optimization id', () => {
    expect(Object.keys(OPTIMIZATION_REGISTRY).sort()).toEqual(Object.values(OPTIMIZATION_IDS).sort());
  });

  it('returns the model unchanged when no optimizations are enabled', () => {
    const model = {
      processes: [
        {
          id: 'Process_1',
          elements: [{ id: 'Task_1', type: 'bpmn:Task', name: 'Do work' }]
        }
      ]
    };

    expect(applyOptimizations(model, [])).toEqual(model);
  });
});
