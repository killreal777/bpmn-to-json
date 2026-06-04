import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';
import { cleanRecord, cloneModel, isRecord } from './utils.js';

export const omitRedundantGraphRefsOptimization = {
  id: OPTIMIZATION_IDS.omitRedundantGraphRefs,
  apply(model) {
    const next = cloneModel(model);
    const processes = Array.isArray(next.processes) ? next.processes : [];

    for (const process of processes) {
      if (!isRecord(process) || !Array.isArray(process.elements)) {
        continue;
      }

      process.elements = process.elements.map(omitElementGraphRefs);
    }

    return next;
  }
} satisfies Optimization;

function omitElementGraphRefs(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return cleanRecord({
    ...value,
    incoming: undefined,
    outgoing: undefined
  });
}
