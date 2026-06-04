import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';

export const compactConditionsOptimization = {
  id: OPTIMIZATION_IDS.compactConditions,
  apply(model) {
    return model;
  }
} satisfies Optimization;
