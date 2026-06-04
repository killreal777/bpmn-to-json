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

  it('compacts Camunda call mappings into short in and out arrays', () => {
    const model = {
      processes: [
        {
          elements: [
            {
              meta: 'CallRiskCheck,CallActivity,Run risk check,call=risk-check',
              extensions: {
                'camunda:In': [
                  { source: 'applicationId', target: 'applicationId' },
                  { source: 'applicantName', target: 'clientId' },
                  { source: 'clientId', target: 'applicantName' },
                  { source: 'amount', target: 'loanAmount' }
                ],
                'camunda:Out': [
                  { sourceExpression: 'riskScore', target: 'riskScore' }
                ]
              }
            }
          ]
        }
      ]
    };

    const optimized = applyOptimizations(model, [OPTIMIZATION_IDS.compactCallMappings]);
    const [process] = optimized.processes as Array<{ elements: Array<Record<string, unknown>> }>;

    expect(process.elements[0]).toEqual({
      meta: 'CallRiskCheck,CallActivity,Run risk check,call=risk-check',
      in: ['applicationId', 'applicantName->clientId', 'clientId->applicantName', 'amount->loanAmount'],
      out: ['riskScore']
    });
  });

  it('compacts sequence flows into CSV-like strings with conditions', () => {
    const model = {
      processes: [
        {
          flows: [
            {
              id: 'Flow_Start_To_Task',
              type: 'bpmn:SequenceFlow',
              sourceRef: 'StartEvent_1',
              targetRef: 'Task_1'
            },
            {
              id: 'Flow_Gateway_To_Approve',
              type: 'bpmn:SequenceFlow',
              name: 'approved',
              sourceRef: 'Gateway_1',
              targetRef: 'Task_Approve',
              condition: {
                type: 'bpmn:FormalExpression',
                body: 'riskScore < 50',
                language: 'feel'
              }
            }
          ]
        }
      ]
    };

    const optimized = applyOptimizations(model, [
      OPTIMIZATION_IDS.compactConditions,
      OPTIMIZATION_IDS.compactFlows
    ]);
    const [process] = optimized.processes as Array<{ flows: string[] }>;

    expect(process.flows).toEqual([
      'StartEvent_1,Task_1',
      'Gateway_1,Task_Approve,approved,riskScore < 50@feel'
    ]);
  });

  it('omits redundant graph refs and top-level metadata', () => {
    const model = {
      definitions: { id: 'Definitions_1' },
      collaborations: [{ id: 'Collaboration_1' }],
      processes: [
        {
          elements: [
            {
              meta: 'Task_1,Task,Do work',
              incoming: ['Flow_Start_To_Task'],
              outgoing: ['Flow_Task_To_End']
            }
          ],
          flows: ['StartEvent_1,Task_1']
        }
      ]
    };

    const optimized = applyOptimizations(model, [
      OPTIMIZATION_IDS.omitRedundantGraphRefs,
      OPTIMIZATION_IDS.omitTopLevelMetadata
    ]);

    expect(optimized).toEqual({
      processes: [
        {
          elements: [
            {
              meta: 'Task_1,Task,Do work'
            }
          ],
          flows: ['StartEvent_1,Task_1']
        }
      ]
    });
  });
});
