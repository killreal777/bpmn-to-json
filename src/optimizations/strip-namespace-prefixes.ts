import { OPTIMIZATION_IDS } from './ids.js';
import type { BpmnJsonModel, Optimization } from './types.js';
import { isRecord } from './utils.js';

const NAMESPACE_PREFIX_PATTERN = /(?:camunda|camunca|bpmn):/gi;

export const stripNamespacePrefixesOptimization = {
  id: OPTIMIZATION_IDS.stripNamespacePrefixes,
  apply(model) {
    return stripValue(model) as BpmnJsonModel;
  }
} satisfies Optimization;

function stripValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripString(value);
  }

  if (Array.isArray(value)) {
    return value.map(stripValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    stripString(key),
    stripValue(item)
  ]));
}

function stripString(value: string): string {
  return value.replace(NAMESPACE_PREFIX_PATTERN, '');
}
