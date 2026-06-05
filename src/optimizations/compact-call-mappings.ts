import { OPTIMIZATION_IDS } from './ids.js';
import type { Optimization } from './types.js';
import { cleanRecord, cloneModel, isRecord } from './utils.js';

export const compactCallMappingsOptimization = {
  id: OPTIMIZATION_IDS.compactCallMappings,
  apply(model) {
    const next = cloneModel(model);
    const processes = Array.isArray(next.processes) ? next.processes : [];

    for (const process of processes) {
      if (!isRecord(process) || !Array.isArray(process.elements)) {
        continue;
      }

      process.elements = process.elements.map(compactElementMappings);
    }

    return next;
  }
} satisfies Optimization;

function compactElementMappings(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.extensions)) {
    return value;
  }

  const extensions = { ...value.extensions };
  const inputMappings = compactMappings(extensions['camunda:In']);
  const outputMappings = compactMappings(extensions['camunda:Out']);

  delete extensions['camunda:In'];
  delete extensions['camunda:Out'];

  return cleanRecord({
    ...value,
    extensions: cleanRecord(extensions),
    in: inputMappings,
    out: outputMappings
  });
}

function compactMappings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const mappings = value
    .map(compactMapping)
    .filter((mapping): mapping is string => Boolean(mapping));

  return mappings.length > 0 ? mappings : undefined;
}

function compactMapping(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const variables = stringValue(value.variables);
  if (variables === 'all') {
    return '*';
  }

  const source = stringValue(value.source);
  const sourceExpression = stringValue(value.sourceExpression);
  const target = stringValue(value.target);

  if (sourceExpression && target) {
    return `=${sourceExpression}->${target}`;
  }

  if (!source || !target) {
    return undefined;
  }

  return source === target ? source : `${source}->${target}`;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}
