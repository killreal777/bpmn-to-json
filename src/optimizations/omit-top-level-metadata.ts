import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';
import { cleanRecord, cloneModel } from './utils.js';

export const omitTopLevelMetadataOptimization = {
  id: OPTIMIZATION_IDS.omitTopLevelMetadata,
  apply(model) {
    const next = cloneModel(model);

    return cleanRecord({
      ...next,
      definitions: undefined,
      collaborations: undefined
    }) ?? {};
  }
} satisfies Optimization;
