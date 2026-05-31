import { createRequire } from 'node:module';
import BpmnModdle from 'bpmn-moddle';
import {
  type CompressionConfig,
  type CompressionPresetName,
  resolveCompressionConfig
} from './config.js';

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

  return cleanValue({
    definitions: config.optimizations?.omitDefinitions ? undefined : cleanValue({ id: definitions.id }),
    collaborations: isExcludedByConfig('collaborations', config)
      ? undefined
      : sortItems(rootElements.filter((element) => element.$type === 'bpmn:Collaboration').map(projectCollaboration)),
    processes: sortItems(rootElements.filter((element) => element.$type === 'bpmn:Process').map((process) => projectProcess(process, config))),
    warnings: warnings.map((warning: { message?: string }) => cleanValue({ message: warning.message }))
  }) as ConversionResult;
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

function projectProcess(process: ModdleElement, config: CompressionConfig): unknown {
  const flowElements = arrayOf<ModdleElement>(process.flowElements).filter((element) => !isExcludedElement(element));
  const sequenceFlows = flowElements.filter((element) => element.$type === 'bpmn:SequenceFlow');
  const elements = flowElements.filter((element) => element.$type !== 'bpmn:SequenceFlow');

  return cleanValue({
    id: process.id,
    type: projectType(process.$type, config),
    name: process.name,
    elements: sortItems(elements.map((element) => projectFlowElement(element, config))),
    flows: sortItems(sequenceFlows.map((flow) => projectSequenceFlow(flow, config)))
  });
}

function projectFlowElement(element: ModdleElement, config: CompressionConfig): unknown {
  const execution = projectExecution(element);
  const impl = projectImplementation(element, execution, config);

  return cleanValue({
    id: element.id,
    type: projectType(element.$type, config),
    name: element.name,
    documentation: projectDocumentation(element.documentation),
    calledElement: config.optimizations?.compactCallActivity ? undefined : stringValue(element.calledElement),
    call: config.optimizations?.compactCallActivity ? stringValue(element.calledElement) : undefined,
    scriptFormat: stringValue(element.scriptFormat),
    script: projectScript(element.script),
    impl,
    execution: impl ? undefined : execution,
    extensions: projectExtensions(element.extensionElements, config),
    incoming: config.optimizations?.omitIncomingOutgoing ? undefined : idsOf(element.incoming),
    outgoing: config.optimizations?.omitIncomingOutgoing ? undefined : idsOf(element.outgoing)
  });
}

function projectSequenceFlow(flow: ModdleElement, config: CompressionConfig): unknown {
  const refs = config.optimizations?.compactFlowRefs
    ? { from: idOf(flow.sourceRef), to: idOf(flow.targetRef) }
    : { sourceRef: idOf(flow.sourceRef), targetRef: idOf(flow.targetRef) };

  return cleanValue({
    id: flow.id,
    type: projectType(flow.$type, config),
    name: flow.name,
    ...refs,
    condition: projectExpression(flow.conditionExpression, config),
    execution: projectExecution(flow)
  });
}

function projectExecution(element: ModdleElement): unknown {
  const execution: Record<string, unknown> = {};

  for (const [sourceKey, outputKey] of EXECUTION_KEY_MAP) {
    const value = primitiveOrId(element[sourceKey]);
    if (value !== undefined) {
      execution[outputKey] = value;
    }
  }

  return cleanValue(execution);
}

function projectExtensions(value: unknown, config: CompressionConfig): unknown {
  const extensionElements = isRecord(value) ? arrayOf<ModdleElement>(value.values) : [];
  const grouped: Record<string, string[]> = {};
  const fallback: unknown[] = [];

  for (const element of extensionElements) {
    const type = element.$type;
    const compactMapping = compactExtensionMapping(element, config);

    if (type && compactMapping) {
      grouped[type] = [...(grouped[type] ?? []), compactMapping];
      continue;
    }

    fallback.push(projectExtensionObject(element));
  }

  return cleanValue({
    ...sortObject(grouped),
    other: sortItems(fallback)
  });
}

function compactExtensionMapping(element: ModdleElement, config: CompressionConfig): string | undefined {
  const source = stringValue(element.source ?? element.sourceExpression);
  const target = stringValue(element.target);

  if (!source || !target) {
    return undefined;
  }

  return config.optimizations?.compactSameNameMappings && source === target ? source : `${source}->${target}`;
}

function projectExtensionObject(element: ModdleElement): unknown {
  const projected: Record<string, unknown> = {
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

function projectExpression(value: unknown, config: CompressionConfig): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  if (config.optimizations?.compactConditions) {
    const body = stringValue(value.body);
    const language = stringValue(value.language);

    if (!language) {
      return body;
    }

    return cleanValue({
      body,
      lang: language
    });
  }

  return cleanValue({
    type: value.$type,
    body: stringValue(value.body),
    language: stringValue(value.language)
  });
}

function projectImplementation(element: ModdleElement, execution: unknown, config: CompressionConfig): string | undefined {
  if (!config.optimizations?.compactServiceTaskImplementation || !isServiceTaskLike(element) || !isRecord(execution)) {
    return undefined;
  }

  const implementationKeys = [
    'camunda:delegateExpression',
    'camunda:class',
    'camunda:expression',
    'camunda:topic'
  ];
  const present = implementationKeys
    .map((key) => execution[key])
    .filter((value): value is string => typeof value === 'string' && value !== '');

  return present.length === 1 ? present[0] : undefined;
}

function projectType(type: unknown, config: CompressionConfig): unknown {
  if (!config.optimizations?.compactTypes || typeof type !== 'string') {
    return type;
  }

  return type.startsWith('bpmn:') ? type.slice('bpmn:'.length) : type;
}

function isServiceTaskLike(element: ModdleElement): boolean {
  return element.$type === 'bpmn:ServiceTask' || element.$type === 'bpmn:SendTask' || element.$type === 'bpmn:BusinessRuleTask';
}

function isExcludedByConfig(path: string, config: CompressionConfig): boolean {
  return config.fields?.exclude?.includes(path) ?? false;
}

function projectDocumentation(value: unknown): unknown {
  const docs = arrayOf<ModdleElement>(value)
    .map((doc) => stringValue(doc.text ?? doc.textFormat))
    .filter((text): text is string => Boolean(text));

  return docs;
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
