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

      process.type = compactBpmnType(process.type);
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
    extras.push(implementation);
  }

  if (typeof value.calledElement === 'string' && value.calledElement !== '') {
    extras.push(value.calledElement);
  }

  const external = extractExternalType(execution);
  if (external) {
    extras.push(external);
  }

  const asyncBefore = extractAsyncBefore(execution);
  if (asyncBefore) {
    extras.push(asyncBefore);
  }

  const meta = formatCsvLine([
    compactBpmnType(value.type),
    stringValue(value.id),
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
    execution: execution ? cleanRecord(compactExecution(execution)) : undefined
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
  return normalizeImplementationValue(value as string);
}

function extractExternalType(execution: Record<string, unknown> | undefined): string | undefined {
  if (!execution || execution['camunda:type'] !== 'external') {
    return undefined;
  }

  delete execution['camunda:type'];
  return 'external';
}

function extractAsyncBefore(execution: Record<string, unknown> | undefined): string | undefined {
  if (!execution || execution['camunda:asyncBefore'] !== true) {
    return undefined;
  }

  delete execution['camunda:asyncBefore'];
  return 'asyncBefore';
}

function compactExecution(execution: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(execution).map(([key, value]) => [
    stripNamespace(key),
    typeof value === 'string' ? stripNamespace(value) : value
  ]));
}

function normalizeImplementationValue(value: string): string {
  const expressionMatch = /^\$\{(.+)\}$/.exec(value);
  return expressionMatch ? expressionMatch[1] : value;
}

function stripNamespace(value: string): string {
  const knownPrefixes = ['bpmn:', 'camunda:', 'bpmndi:', 'dc:', 'di:'];
  const prefix = knownPrefixes.find((item) => value.startsWith(item));
  return prefix ? value.slice(prefix.length) : value;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}
