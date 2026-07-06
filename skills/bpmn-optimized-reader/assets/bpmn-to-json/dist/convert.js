import { createRequire } from 'node:module';
import BpmnModdle from 'bpmn-moddle';
import { resolveCompressionConfig } from './config.js';
import { applyOptimizations } from './optimizations/pipeline.js';
const require = createRequire(import.meta.url);
const camundaModdle = require('camunda-bpmn-moddle/resources/camunda.json');
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
const EXECUTION_KEY_MAP = new Map([
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
export async function convertBpmnToJson(xml, options = {}) {
    const config = resolveCompressionConfig(options.config ?? (options.preset ? { extends: options.preset } : undefined));
    const moddle = new BpmnModdle({ camunda: camundaModdle });
    const { rootElement, warnings } = await moddle.fromXML(xml);
    const definitions = rootElement;
    const rootElements = arrayOf(definitions.rootElements);
    const projected = cleanValue({
        definitions: cleanValue({ id: definitions.id }),
        collaborations: isExcludedByConfig('collaborations', config)
            ? undefined
            : sortItems(rootElements.filter((element) => element.$type === 'bpmn:Collaboration').map(projectCollaboration)),
        processes: sortItems(rootElements.filter((element) => element.$type === 'bpmn:Process').map(projectProcess)),
        warnings: warnings.map((warning) => cleanValue({ message: warning.message }))
    });
    const optimized = applyOptimizations(projected, config.optimizations?.enabled ?? []);
    return applyFieldExclusions(optimized, config);
}
function projectCollaboration(collaboration) {
    return cleanValue({
        id: collaboration.id,
        name: collaboration.name,
        participants: sortItems(arrayOf(collaboration.participants).map((participant) => cleanValue({
            id: participant.id,
            name: participant.name,
            processRef: idOf(participant.processRef)
        })))
    });
}
function projectProcess(process) {
    const flowElements = arrayOf(process.flowElements).filter((element) => !isExcludedElement(element));
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
function projectFlowElement(element) {
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
function projectSequenceFlow(flow) {
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
function projectExecution(element) {
    const execution = {};
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
function projectExtensions(value) {
    const extensionElements = isRecord(value) ? arrayOf(value.values) : [];
    const grouped = {};
    const fallback = [];
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
function projectExtensionObject(element, omitType = false) {
    const projected = omitType ? {} : {
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
function projectScript(value) {
    if (typeof value === 'string') {
        return stringValue(value);
    }
    if (isRecord(value)) {
        return stringValue(value.body ?? value.value);
    }
    return undefined;
}
function projectExpression(value) {
    if (!isRecord(value)) {
        return undefined;
    }
    return cleanValue({
        type: value.$type,
        body: stringValue(value.body),
        language: stringValue(value.language)
    });
}
function isExcludedByConfig(path, config) {
    return config.fields?.exclude?.includes(path) ?? false;
}
function applyFieldExclusions(value, config) {
    const excludes = config.fields?.exclude ?? [];
    if (excludes.length === 0) {
        return value;
    }
    return cleanValue(excludes.reduce((current, path) => removePath(current, path.split('.')), value));
}
function removePath(value, path) {
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
function idsOf(value) {
    return arrayOf(value)
        .map(idOf)
        .filter((id) => Boolean(id))
        .sort();
}
function idOf(value) {
    if (typeof value === 'string') {
        return stringValue(value);
    }
    if (isRecord(value) && typeof value.id === 'string') {
        return stringValue(value.id);
    }
    return undefined;
}
function primitiveOrId(value) {
    if (typeof value === 'string') {
        return stringValue(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return idOf(value);
}
function isExcludedElement(element) {
    return Boolean(element.$type && EXCLUDED_TYPES.has(element.$type));
}
function sortItems(items) {
    return [...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}
function sortObject(value) {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}
function sortKey(value) {
    if (!isRecord(value)) {
        return String(value);
    }
    return [value.id, value.type ?? value.$type, value.name]
        .map((part) => (typeof part === 'string' ? part : ''))
        .join('|');
}
function cleanValue(value) {
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
        .map(([key, item]) => [key, cleanValue(item)])
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) {
        return undefined;
    }
    return Object.fromEntries(entries);
}
function arrayOf(value) {
    return Array.isArray(value) ? value : [];
}
function stringValue(value) {
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
