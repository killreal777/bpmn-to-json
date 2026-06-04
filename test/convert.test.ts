import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { getPresetConfig } from '../src/config.js';
import { convertBpmnToJson } from '../src/convert.js';

describe('convertBpmnToJson', () => {
  it('projects a linear process without layout data', async () => {
    const xml = await readFile('test/fixtures/simple-linear.bpmn', 'utf8');
    const result = await convertBpmnToJson(xml);
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      definitions: { id: 'Definitions_SimpleLinear' },
      processes: [
        {
          id: 'Process_SimpleLinear',
          name: 'Simple linear',
          elements: [
            { id: 'EndEvent_1', type: 'bpmn:EndEvent', incoming: ['Flow_Task_To_End'] },
            { id: 'StartEvent_1', type: 'bpmn:StartEvent', outgoing: ['Flow_Start_To_Task'] },
            {
              id: 'Task_1',
              type: 'bpmn:Task',
              name: 'Do work',
              incoming: ['Flow_Start_To_Task'],
              outgoing: ['Flow_Task_To_End']
            }
          ],
          flows: [
            { id: 'Flow_Start_To_Task', sourceRef: 'StartEvent_1', targetRef: 'Task_1' },
            { id: 'Flow_Task_To_End', sourceRef: 'Task_1', targetRef: 'EndEvent_1' }
          ]
        }
      ]
    });
    expect(serialized).not.toContain('BPMNDiagram');
    expect(serialized).not.toContain('Bounds');
    expect(serialized).not.toContain('waypoint');
    expect(serialized).not.toContain('targetNamespace');
    expect(serialized).not.toContain('isExecutable');
  });

  it('preserves execution details and structured extension mappings in base mode', async () => {
    const xml = await readFile('docs/bpmn-examples/loan-application-process.bpmn', 'utf8');
    const result = await convertBpmnToJson(xml);
    const [process] = result.processes as Array<{ elements: Array<Record<string, unknown>> }>;

    const saveApplication = process.elements.find((element) => element.id === 'SaveApplication');
    const callRiskCheck = process.elements.find((element) => element.id === 'CallRiskCheck');
    const serialized = JSON.stringify(result);

    expect(saveApplication).toMatchObject({
      id: 'SaveApplication',
      type: 'bpmn:ServiceTask',
      name: 'Save application'
    });
    expect(saveApplication?.execution).toEqual({
      'camunda:asyncBefore': true,
      'camunda:delegateExpression': '${saveApplicationDelegate}'
    });
    expect(callRiskCheck).toMatchObject({
      id: 'CallRiskCheck',
      type: 'bpmn:CallActivity',
      name: 'Run risk check',
      calledElement: 'risk-check',
      execution: {
        'camunda:asyncBefore': true
      },
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
    });
    expect(serialized).not.toContain('historyTimeToLive');
    expect(serialized).not.toContain('targetNamespace');
    expect(serialized).not.toContain('isExecutable');
    expect(serialized).not.toContain('"documentation"');
    expect(serialized).not.toContain('"impl"');
    expect(serialized).not.toContain('"call"');
    expect(serialized).not.toContain('applicationId->applicationId');
  });

  it('uses the base preset by default', async () => {
    const xml = await readFile('docs/bpmn-examples/loan-application-process.bpmn', 'utf8');

    const defaultResult = await convertBpmnToJson(xml);
    const baseByName = await convertBpmnToJson(xml, { preset: 'base' });
    const baseByConfig = await convertBpmnToJson(xml, { config: getPresetConfig('base') });

    expect(defaultResult).toEqual(baseByName);
    expect(defaultResult).toEqual(baseByConfig);
  });

  it('applies optimized element meta', async () => {
    const xml = await readFile('docs/bpmn-examples/loan-application-process.bpmn', 'utf8');
    const result = await convertBpmnToJson(xml, { preset: 'optimized' });
    const serialized = JSON.stringify(result);
    const [process] = result.processes as Array<{
      elements: Array<Record<string, unknown>>;
    }>;

    expect(result).not.toHaveProperty('definitions');
    expect(result).not.toHaveProperty('collaborations');
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
      },
      in: ['applicationId', 'applicantName->clientId', 'clientId->applicantName', 'amount->loanAmount'],
      out: ['riskScore']
    });
    expect(serialized).not.toContain('"type":"bpmn:ServiceTask"');
    expect(serialized).not.toContain('"type":"bpmn:CallActivity"');
    expect(serialized).not.toContain('"id":"SaveApplication"');
    expect(serialized).not.toContain('"type":"ServiceTask"');
    expect(serialized).not.toContain('"name":"Save application"');
    expect(serialized).not.toContain('"calledElement"');
    expect(serialized).not.toContain('"impl"');
    expect(serialized).not.toContain('"call"');
    expect(serialized).not.toContain('"extensions"');
    expect(serialized).not.toContain('camunda:In');
    expect(serialized).not.toContain('camunda:Out');
    expect(serialized).not.toContain('"incoming"');
    expect(serialized).not.toContain('"outgoing"');
  });

  it('excludes configured fields from the final output', async () => {
    const xml = await readFile('docs/bpmn-examples/loan-application-process.bpmn', 'utf8');
    const result = await convertBpmnToJson(xml, {
      config: {
        extends: 'base',
        fields: {
          exclude: ['definitions', 'collaborations', 'elements.incoming', 'elements.outgoing']
        }
      }
    });
    const serialized = JSON.stringify(result);

    expect(result).not.toHaveProperty('definitions');
    expect(result).not.toHaveProperty('collaborations');
    expect(serialized).not.toContain('"incoming"');
    expect(serialized).not.toContain('"outgoing"');
    expect(serialized).toContain('"flows"');
  });

  it('projects gateway conditions deterministically', async () => {
    const xml = await readFile('test/fixtures/gateway-condition.bpmn', 'utf8');
    const first = await convertBpmnToJson(xml);
    const second = await convertBpmnToJson(xml);
    const [process] = first.processes as Array<{ flows: Array<Record<string, unknown>> }>;

    expect(first).toEqual(second);
    expect(process.flows).toContainEqual({
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
    });
    expect(process.flows).toContainEqual({
      id: 'Flow_Gateway_To_Reject',
      type: 'bpmn:SequenceFlow',
      name: 'rejected',
      sourceRef: 'Gateway_1',
      targetRef: 'Task_Reject',
      condition: {
        type: 'bpmn:FormalExpression',
        body: 'riskScore >= 50'
      }
    });
  });

  it('applies optimized flow strings with compact conditions', async () => {
    const xml = await readFile('test/fixtures/gateway-condition.bpmn', 'utf8');
    const result = await convertBpmnToJson(xml, { preset: 'optimized' });
    const [process] = result.processes as Array<{ flows: string[] }>;
    const serialized = JSON.stringify(result);

    expect(process.flows).toContain('StartEvent_1,Gateway_1');
    expect(process.flows).toContain('Gateway_1,Task_Approve,approved,riskScore < 50@feel');
    expect(process.flows).toContain('Gateway_1,Task_Reject,rejected,riskScore >= 50');
    expect(serialized).not.toContain('"sourceRef"');
    expect(serialized).not.toContain('"targetRef"');
    expect(serialized).not.toContain('"condition"');
    expect(serialized).not.toContain('"type":"bpmn:SequenceFlow"');
  });
});
