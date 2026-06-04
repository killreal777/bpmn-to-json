import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';
import {
  cleanRecord,
  cloneModel,
  compactBpmnType,
  formatCsvLine,
  isRecord
} from './utils.js';

const IMPLEMENTATION_KEYS = [
  'camunda:delegateExpression',
  'camunda:class',
  'camunda:expression',
  'camunda:topic'
];

export const compactElementMetaOptimization = {
  id: OPTIMIZATION_IDS.compactElementMeta,
  apply(model) {
    const next = cloneModel(model);
    const processes = Array.isArray(next.processes) ? next.processes : [];

    for (const process of processes) {
      if (!isRecord(process) || !Array.isArray(process.elements)) {
        continue;
      }

      process.elements = process.elements.map(compactElement);
    }

    return next;
  }
} satisfies Optimization;

function compactElement(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const execution = isRecord(value.execution) ? { ...value.execution } : undefined;
  const extras: string[] = [];
  const implementation = extractImplementation(execution);

  if (implementation) {
    extras.push(`impl=${implementation}`);
  }

  if (typeof value.calledElement === 'string' && value.calledElement !== '') {
    extras.push(`call=${value.calledElement}`);
  }

  const asyncBefore = extractAsyncBefore(execution);
  if (asyncBefore) {
    extras.push(asyncBefore);
  }

  const meta = formatCsvLine([
    stringValue(value.id),
    compactBpmnType(value.type),
    stringValue(value.name),
    ...extras
  ]);

  const compacted: Record<string, unknown> = {
    meta,
    ...value,
    id: undefined,
    type: undefined,
    name: undefined,
    calledElement: undefined,
    execution: execution ? cleanRecord(execution) : undefined
  };

  return cleanRecord(compacted);
}

function extractImplementation(execution: Record<string, unknown> | undefined): string | undefined {
  if (!execution) {
    return undefined;
  }

  const present = IMPLEMENTATION_KEYS
    .map((key) => [key, execution[key]] as const)
    .filter(([, value]) => typeof value === 'string' && value !== '');

  if (present.length !== 1) {
    return undefined;
  }

  const [[key, value]] = present;
  delete execution[key];
  return value as string;
}

function extractAsyncBefore(execution: Record<string, unknown> | undefined): string | undefined {
  if (!execution || execution['camunda:asyncBefore'] !== true) {
    return undefined;
  }

  delete execution['camunda:asyncBefore'];
  return 'asyncBefore';
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}
