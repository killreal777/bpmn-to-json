import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';

export const compactElementMetaOptimization = {
  id: OPTIMIZATION_IDS.compactElementMeta,
  apply(model) {
    return model;
  }
} satisfies Optimization;
