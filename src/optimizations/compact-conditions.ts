import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';
import { cleanRecord, cloneModel, compactCondition, isRecord } from './utils.js';

export const compactConditionsOptimization = {
  id: OPTIMIZATION_IDS.compactConditions,
  apply(model) {
    const next = cloneModel(model);
    const processes = Array.isArray(next.processes) ? next.processes : [];

    for (const process of processes) {
      if (!isRecord(process) || !Array.isArray(process.flows)) {
        continue;
      }

      process.flows = process.flows.map(compactFlowCondition);
    }

    return next;
  }
} satisfies Optimization;

function compactFlowCondition(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return cleanRecord({
    ...value,
    condition: compactCondition(value.condition)
  });
}
