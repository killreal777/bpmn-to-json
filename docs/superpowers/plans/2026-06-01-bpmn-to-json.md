# BPMN to JSON Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local TypeScript CLI that converts BPMN XML into deterministic compact JSON.

**Architecture:** `src/cli.ts` handles file IO and command-line errors. `src/convert.ts` parses BPMN with `bpmn-moddle`, projects semantic and execution information into compact JSON, prunes empty values, and sorts output deterministically.

**Tech Stack:** TypeScript, Node.js, `bpmn-moddle`, `tsx`, `vitest`.

---

## File Structure

- Create `package.json`: npm scripts and dependencies.
- Create `tsconfig.json`: strict ESM TypeScript config for Node.
- Create `src/convert.ts`: BPMN parsing and compact JSON projection.
- Create `src/cli.ts`: CLI argument parsing, file reading/writing, error handling.
- Create `test/fixtures/simple-linear.bpmn`: minimal start-task-end process with BPMNDI layout.
- Create `test/fixtures/gateway-condition.bpmn`: gateway process with conditions.
- Create `test/convert.test.ts`: focused TDD tests for projection, execution details, layout exclusion, determinism.
- Create `docs/ACCEPTANCE.md`: smoke acceptance report after implementation.

### Task 1: Project Scaffold and First Failing Test

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `test/fixtures/simple-linear.bpmn`
- Create: `test/convert.test.ts`

- [ ] **Step 1: Create package and TypeScript config**

```json
{
  "name": "bpmn-to-json",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "convert": "tsx src/cli.ts"
  },
  "dependencies": {
    "bpmn-moddle": "^9.0.4"
  },
  "devDependencies": {
    "@types/node": "^22.15.29",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.4"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"],
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 2: Add simple BPMN fixture**

Create `test/fixtures/simple-linear.bpmn` with a start event, task, end event, sequence flows, and BPMNDI layout data.

- [ ] **Step 3: Write failing structure/layout test**

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { convertBpmnToJson } from '../src/convert.js';

it('projects a linear process without layout data', async () => {
  const xml = await readFile('test/fixtures/simple-linear.bpmn', 'utf8');
  const result = await convertBpmnToJson(xml);
  const serialized = JSON.stringify(result);

  expect(result).toMatchObject({
    definitions: { id: 'Definitions_SimpleLinear' },
    processes: [
      {
        id: 'Process_SimpleLinear',
        elements: [
          { id: 'EndEvent_1', type: 'bpmn:EndEvent', incoming: ['Flow_Task_To_End'] },
          { id: 'StartEvent_1', type: 'bpmn:StartEvent', outgoing: ['Flow_Start_To_Task'] },
          { id: 'Task_1', type: 'bpmn:Task', name: 'Do work' }
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- test/convert.test.ts`

Expected: FAIL because dependencies or `src/convert.ts` do not exist yet.

### Task 2: Minimal Converter

**Files:**
- Create: `src/convert.ts`
- Modify: `test/convert.test.ts`

- [ ] **Step 1: Implement minimal `convertBpmnToJson`**

Implement parsing with `BpmnModdle.fromXML`, projection for definitions, process elements, sequence flows, incoming/outgoing ids, pruning, and deterministic sorting.

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- test/convert.test.ts`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

### Task 3: Execution Details and Extension Elements

**Files:**
- Modify: `test/convert.test.ts`
- Modify: `src/convert.ts`

- [ ] **Step 1: Write failing execution details test**

Use `docs/bpmn-examples/loan-application-process.bpmn` and assert:

```ts
expect(saveApplication.execution).toEqual({
  'camunda:asyncBefore': true,
  'camunda:delegateExpression': '${saveApplicationDelegate}'
});
expect(callRiskCheck).toMatchObject({
  id: 'CallRiskCheck',
  type: 'bpmn:CallActivity',
  calledElement: 'risk-check',
  execution: { 'camunda:asyncBefore': true },
  extensions: [
    { type: 'camunda:In', source: 'applicationId', target: 'applicationId' },
    { type: 'camunda:In', source: 'applicantName', target: 'clientId' },
    { type: 'camunda:In', source: 'clientId', target: 'applicantName' },
    { type: 'camunda:In', source: 'amount', target: 'loanAmount' },
    { type: 'camunda:Out', sourceExpression: 'riskScore', target: 'riskScore' }
  ]
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/convert.test.ts`

Expected: FAIL because execution and extension projection is incomplete.

- [ ] **Step 3: Implement execution and extension projection**

Preserve execution-related primitive attributes such as `camunda:asyncBefore`, `camunda:delegateExpression`, `camunda:class`, `camunda:expression`, `camunda:topic`, assignee/group/form fields, scripts, result variables, decision references, and `calledElement`. Exclude `camunda:historyTimeToLive`.

- [ ] **Step 4: Run test and typecheck**

Run: `npm test -- test/convert.test.ts && npm run typecheck`

Expected: PASS.

### Task 4: Gateway Conditions and Determinism

**Files:**
- Create: `test/fixtures/gateway-condition.bpmn`
- Modify: `test/convert.test.ts`
- Modify: `src/convert.ts`

- [ ] **Step 1: Add gateway fixture and failing test**

Add a BPMN fixture with an exclusive gateway and two conditional sequence flows. Test that flow conditions are projected and two conversions are deeply equal.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/convert.test.ts`

Expected: FAIL until condition expressions are projected.

- [ ] **Step 3: Implement condition expression projection**

For `bpmn:SequenceFlow`, include `condition` with `type`, `body`, and `language` when present.

- [ ] **Step 4: Run test and typecheck**

Run: `npm test -- test/convert.test.ts && npm run typecheck`

Expected: PASS.

### Task 5: CLI

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Write CLI implementation**

Implement `npx tsx src/cli.ts input.bpmn -o output.json`, `--output`, usage errors, read/parse/write errors, and pretty JSON serialization.

- [ ] **Step 2: Smoke run CLI**

Run: `npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o tmp/risk-check.json`

Expected: creates valid JSON.

- [ ] **Step 3: Validate JSON**

Run: `jq . tmp/risk-check.json >/dev/null`

Expected: exit 0.

### Task 6: Manual Acceptance Report

**Files:**
- Create: `docs/ACCEPTANCE.md`

- [ ] **Step 1: Run smoke acceptance commands**

Run conversions for:

```bash
npx tsx src/cli.ts test/fixtures/simple-linear.bpmn -o tmp/simple-1.json
npx tsx src/cli.ts test/fixtures/gateway-condition.bpmn -o tmp/gateway-1.json
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json
diff tmp/loan-1.json tmp/loan-2.json
rg "BPMNDiagram|BPMNPlane|BPMNShape|BPMNEdge|Bounds|waypoint|bpmndi|dc:|di:|width|height|targetNamespace|isExecutable|historyTimeToLive" tmp/*.json
```

Expected: conversions succeed, diff is empty, and `rg` exits 1 because no forbidden strings are found.

- [ ] **Step 2: Write acceptance report**

Create `docs/ACCEPTANCE.md` using the format from `docs/REQUIREMENTS.md`.

- [ ] **Step 3: Final verification**

Run: `npm test && npm run typecheck`

Expected: PASS.
