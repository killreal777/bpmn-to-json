import { describe, expect, it } from 'vitest';
import { OPTIMIZATION_IDS } from '../src/optimizations/ids.js';
import { applyOptimizations } from '../src/optimizations/pipeline.js';
import { OPTIMIZATION_REGISTRY } from '../src/optimizations/registry.js';

describe('optimization pipeline', () => {
  it('defines the approved optimization ids', () => {
    expect(OPTIMIZATION_IDS).toEqual({
      compactElementMeta: 'compactElementMeta',
      compactCallMappings: 'compactCallMappings',
      compactFlows: 'compactFlows',
      compactConditions: 'compactConditions',
      omitRedundantGraphRefs: 'omitRedundantGraphRefs',
      omitTopLevelMetadata: 'omitTopLevelMetadata'
    });
  });

  it('registers every optimization id', () => {
    expect(Object.keys(OPTIMIZATION_REGISTRY).sort()).toEqual(Object.values(OPTIMIZATION_IDS).sort());
  });

  it('returns the model unchanged when no optimizations are enabled', () => {
    const model = {
      processes: [
        {
          id: 'Process_1',
          elements: [{ id: 'Task_1', type: 'bpmn:Task', name: 'Do work' }]
        }
      ]
    };

    expect(applyOptimizations(model, [])).toEqual(model);
  });

  it('compacts repeated element fields into meta strings', () => {
    const model = {
      processes: [
        {
          elements: [
            {
              id: 'SaveApplication',
              type: 'bpmn:ServiceTask',
              name: 'Save application',
              execution: {
                'camunda:asyncBefore': true,
                'camunda:delegateExpression': '${saveApplicationDelegate}'
              }
            },
            {
              id: 'CallRiskCheck',
              type: 'bpmn:CallActivity',
              name: 'Run risk check',
              calledElement: 'risk-check',
              execution: {
                'camunda:asyncBefore': true
              }
            },
            {
              id: 'StartLoanApplication',
              type: 'bpmn:StartEvent'
            }
          ]
        }
      ]
    };

    const optimized = applyOptimizations(model, [OPTIMIZATION_IDS.compactElementMeta]);
    const [process] = optimized.processes as Array<{ elements: Array<Record<string, unknown>> }>;

    expect(process.elements).toContainEqual({
      meta: 'SaveApplication,ServiceTask,Save application,impl=${saveApplicationDelegate}',
      execution: {
        'camunda:asyncBefore': true
      }
    });
    expect(process.elements).toContainEqual({
      meta: 'CallRiskCheck,CallActivity,Run risk check,call=risk-check',
      execution: {
        'camunda:asyncBefore': true
      }
    });
    expect(process.elements).toContainEqual({
      meta: 'StartLoanApplication,StartEvent'
    });
  });
});
