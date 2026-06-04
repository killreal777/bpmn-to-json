import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';

export const omitRedundantGraphRefsOptimization = {
  id: OPTIMIZATION_IDS.omitRedundantGraphRefs,
  apply(model) {
    return model;
  }
} satisfies Optimization;
