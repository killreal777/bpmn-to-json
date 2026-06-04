import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';

export const compactCallMappingsOptimization = {
  id: OPTIMIZATION_IDS.compactCallMappings,
  apply(model) {
    return model;
  }
} satisfies Optimization;
