import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';
import {
  cloneModel,
  compactCondition,
  formatCsvLine,
  isRecord
} from './utils.js';

export const compactFlowsOptimization = {
  id: OPTIMIZATION_IDS.compactFlows,
  apply(model) {
    const next = cloneModel(model);
    const processes = Array.isArray(next.processes) ? next.processes : [];

    for (const process of processes) {
      if (!isRecord(process) || !Array.isArray(process.flows)) {
        continue;
      }

      process.flows = process.flows
        .map(compactFlow)
        .filter((flow): flow is string => Boolean(flow));
    }

    return next;
  }
} satisfies Optimization;

function compactFlow(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return formatCsvLine([
    stringValue(value.sourceRef ?? value.from),
    stringValue(value.targetRef ?? value.to),
    stringValue(value.name),
    compactCondition(value.condition)
  ]);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}
