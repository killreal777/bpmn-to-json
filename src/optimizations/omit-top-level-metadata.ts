import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';

export const omitTopLevelMetadataOptimization = {
  id: OPTIMIZATION_IDS.omitTopLevelMetadata,
  apply(model) {
    return model;
  }
} satisfies Optimization;
