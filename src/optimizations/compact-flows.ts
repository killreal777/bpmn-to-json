import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';

export const compactFlowsOptimization = {
  id: OPTIMIZATION_IDS.compactFlows,
  apply(model) {
    return model;
  }
} satisfies Optimization;
