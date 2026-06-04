import { createRequire } from 'node:module';
import BpmnModdle from 'bpmn-moddle';
import {
  type CompressionConfig,
  type CompressionPresetName,
  resolveCompressionConfig
} from './config.js';
import { applyOptimizations } from './optimizations/pipeline.js';

const require = createRequire(import.meta.url);
const camundaModdle = require('camunda-bpmn-moddle/resources/camunda.json') as Record<string, unknown>;

type ModdleElement = {
  $type?: string;
  id?: string;
  name?: string;
  [key: string]: unknown;
};

type ConversionResult = Record<string, unknown>;

export type ConvertOptions = {
  preset?: CompressionPresetName;
  config?: CompressionConfig;
};

const EXCLUDED_TYPES = new Set([
  'bpmndi:BPMNDiagram',
  'bpmndi:BPMNPlane',
  'bpmndi:BPMNShape',
  'bpmndi:BPMNEdge',
  'dc:Bounds',
  'di:waypoint'
]);

const EXCLUDED_KEYS = new Set([
  '$parent',
  'diagrams',
  'plane',
  'planeElement',
  'bounds',
  'waypoint',
  'label',
  'BPMNDiagram',
  'targetNamespace',
  'isExecutable',
  'camunda:historyTimeToLive',
  'historyTimeToLive',
  'exporter',
  'exporterVersion'
]);

const EXECUTION_KEY_MAP = new Map<string, string>([
  ['asyncBefore', 'camunda:asyncBefore'],
  ['asyncAfter', 'camunda:asyncAfter'],
  ['exclusive', 'camunda:exclusive'],
  ['delegateExpression', 'camunda:delegateExpression'],
  ['class', 'camunda:class'],
  ['expression', 'camunda:expression'],
  ['topic', 'camunda:topic'],
  ['type', 'camunda:type'],
  ['assignee', 'camunda:assignee'],
  ['candidateUsers', 'camunda:candidateUsers'],
  ['candidateGroups', 'camunda:candidateGroups'],
  ['formKey', 'camunda:formKey'],
  ['resultVariable', 'camunda:resultVariable'],
  ['decisionRef', 'camunda:decisionRef'],
  ['decisionRefBinding', 'camunda:decisionRefBinding'],
  ['decisionRefVersion', 'camunda:decisionRefVersion'],
  ['decisionRefVersionTag', 'camunda:decisionRefVersionTag'],
  ['mapDecisionResult', 'camunda:mapDecisionResult']
]);

export async function convertBpmnToJson(xml: string, options: ConvertOptions = {}): Promise<ConversionResult> {
  const config = resolveCompressionConfig(options.config ?? (options.preset ? { extends: options.preset } : undefined));
  const moddle = new BpmnModdle({ camunda: camundaModdle });
  const { rootElement, warnings } = await moddle.fromXML(xml);
  const definitions = rootElement as ModdleElement;
  const rootElements = arrayOf<ModdleElement>(definitions.rootElements);

  const projected = cleanValue({
    definitions: cleanValue({ id: definitions.id }),
    collaborations: isExcludedByConfig('collaborations', config)
      ? undefined
      : sortItems(rootElements.filter((element) => element.$type === 'bpmn:Collaboration').map(projectCollaboration)),
    processes: sortItems(rootElements.filter((element) => element.$type === 'bpmn:Process').map(projectProcess)),
    warnings: warnings.map((warning: { message?: string }) => cleanValue({ message: warning.message }))
  });

  const optimized = applyOptimizations(projected as ConversionResult, config.optimizations?.enabled ?? []);
  return applyFieldExclusions(optimized, config) as ConversionResult;
}

function projectCollaboration(collaboration: ModdleElement): unknown {
  return cleanValue({
    id: collaboration.id,
    name: collaboration.name,
    participants: sortItems(arrayOf<ModdleElement>(collaboration.participants).map((participant) => cleanValue({
      id: participant.id,
      name: participant.name,
      processRef: idOf(participant.processRef)
    })))
  });
}

function projectProcess(process: ModdleElement): unknown {
  const flowElements = arrayOf<ModdleElement>(process.flowElements).filter((element) => !isExcludedElement(element));
  const sequenceFlows = flowElements.filter((element) => element.$type === 'bpmn:SequenceFlow');
  const elements = flowElements.filter((element) => element.$type !== 'bpmn:SequenceFlow');

  return cleanValue({
    id: process.id,
    type: process.$type,
    name: process.name,
    elements: sortItems(elements.map(projectFlowElement)),
    flows: sortItems(sequenceFlows.map(projectSequenceFlow))
  });
}

function projectFlowElement(element: ModdleElement): unknown {
  const execution = projectExecution(element);

  return cleanValue({
    id: element.id,
    type: element.$type,
    name: element.name,
    calledElement: stringValue(element.calledElement),
    scriptFormat: stringValue(element.scriptFormat),
    script: projectScript(element.script),
    execution,
    extensions: projectExtensions(element.extensionElements),
    incoming: idsOf(element.incoming),
    outgoing: idsOf(element.outgoing)
  });
}

function projectSequenceFlow(flow: ModdleElement): unknown {
  return cleanValue({
    id: flow.id,
    type: flow.$type,
    name: flow.name,
    sourceRef: idOf(flow.sourceRef),
    targetRef: idOf(flow.targetRef),
    condition: projectExpression(flow.conditionExpression),
    execution: projectExecution(flow)
  });
}

function projectExecution(element: ModdleElement): unknown {
  const execution: Record<string, unknown> = {};

  for (const [sourceKey, outputKey] of EXECUTION_KEY_MAP) {
    if (!Object.prototype.hasOwnProperty.call(element, sourceKey)) {
      continue;
    }

    const value = primitiveOrId(element[sourceKey]);
    if (value !== undefined) {
      execution[outputKey] = value;
    }
  }

  return cleanValue(execution);
}

function projectExtensions(value: unknown): unknown {
  const extensionElements = isRecord(value) ? arrayOf<ModdleElement>(value.values) : [];
  const grouped: Record<string, unknown[]> = {};
  const fallback: unknown[] = [];

  for (const element of extensionElements) {
    const type = element.$type;
    const projected = projectExtensionObject(element, Boolean(type));

    if (type && projected) {
      grouped[type] = [...(grouped[type] ?? []), projected];
      continue;
    }

    fallback.push(projected);
  }

  return cleanValue({
    ...sortObject(grouped),
    other: sortItems(fallback)
  });
}

function projectExtensionObject(element: ModdleElement, omitType = false): unknown {
  const projected: Record<string, unknown> = omitType ? {} : {
    type: element.$type
  };

  for (const [key, item] of Object.entries(element)) {
    if (key === '$type' || EXCLUDED_KEYS.has(key)) {
      continue;
    }

    const primitive = primitiveOrId(item);
    if (primitive !== undefined) {
      projected[key] = primitive;
    }
  }

  return cleanValue(projected);
}

function projectScript(value: unknown): unknown {
  if (typeof value === 'string') {
    return stringValue(value);
  }

  if (isRecord(value)) {
    return stringValue(value.body ?? value.value);
  }

  return undefined;
}

function projectExpression(value: unknown): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  return cleanValue({
    type: value.$type,
    body: stringValue(value.body),
    language: stringValue(value.language)
  });
}

function isExcludedByConfig(path: string, config: CompressionConfig): boolean {
  return config.fields?.exclude?.includes(path) ?? false;
}

function applyFieldExclusions(value: unknown, config: CompressionConfig): unknown {
  const excludes = config.fields?.exclude ?? [];

  if (excludes.length === 0) {
    return value;
  }

  return cleanValue(excludes.reduce((current, path) => removePath(current, path.split('.')), value));
}

function removePath(value: unknown, path: string[]): unknown {
  if (path.length === 0) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => removePath(item, path));
  }

  if (!isRecord(value)) {
    return value;
  }

  const [head, ...tail] = path;
  const next = { ...value };

  if (tail.length === 0) {
    delete next[head];
    return next;
  }

  if (head in next) {
    next[head] = removePath(next[head], tail);
  }

  for (const [key, item] of Object.entries(next)) {
    if (Array.isArray(item)) {
      next[key] = item.map((child) => removePath(child, path));
    }
  }

  return next;
}

function idsOf(value: unknown): string[] {
  return arrayOf<unknown>(value)
    .map(idOf)
    .filter((id): id is string => Boolean(id))
    .sort();
}

function idOf(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return stringValue(value);
  }

  if (isRecord(value) && typeof value.id === 'string') {
    return stringValue(value.id);
  }

  return undefined;
}

function primitiveOrId(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string') {
    return stringValue(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return idOf(value);
}

function isExcludedElement(element: ModdleElement): boolean {
  return Boolean(element.$type && EXCLUDED_TYPES.has(element.$type));
}

function sortItems<T>(items: T[]): T[] {
  return [...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

function sortObject<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

function sortKey(value: unknown): string {
  if (!isRecord(value)) {
    return String(value);
  }

  return [value.id, value.type ?? value.$type, value.name]
    .map((part) => (typeof part === 'string' ? part : ''))
    .join('|');
}

function cleanValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const cleaned = value
      .map(cleanValue)
      .filter((item) => item !== undefined);

    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (!isRecord(value)) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value;
  }

  if (typeof value.$type === 'string' && EXCLUDED_TYPES.has(value.$type)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter(([key]) => !EXCLUDED_KEYS.has(key))
    .map(([key, item]) => [key, cleanValue(item)] as const)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
