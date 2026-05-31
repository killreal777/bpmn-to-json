import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
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

  it('preserves execution details and compact extension mappings', async () => {
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
      'camunda:asyncAfter': false,
      'camunda:asyncBefore': true,
      'camunda:delegateExpression': '${saveApplicationDelegate}',
      'camunda:exclusive': true
    });
    expect(callRiskCheck?.execution).toEqual({
      'camunda:asyncAfter': false,
      'camunda:asyncBefore': true,
      'camunda:exclusive': true
    });
    expect(callRiskCheck).toMatchObject({
      id: 'CallRiskCheck',
      type: 'bpmn:CallActivity',
      name: 'Run risk check',
      calledElement: 'risk-check',
      extensions: [
        { type: 'camunda:In', source: 'applicationId', target: 'applicationId' },
        { type: 'camunda:In', source: 'applicantName', target: 'clientId' },
        { type: 'camunda:In', source: 'clientId', target: 'applicantName' },
        { type: 'camunda:In', source: 'amount', target: 'loanAmount' },
        { type: 'camunda:Out', sourceExpression: 'riskScore', target: 'riskScore' }
      ]
    });
    expect(serialized).not.toContain('historyTimeToLive');
    expect(serialized).not.toContain('targetNamespace');
    expect(serialized).not.toContain('isExecutable');
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
});
