# Optimized Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy optimized preset flags with a typed optimization pipeline and implement the approved aggressive Optimized JSON shape.

**Architecture:** `convert.ts` will always project BPMN XML into Base JSON first. If config resolves to enabled optimizations, it will pass that Base JSON through `src/optimizations/pipeline.ts`. Each optimization is a stateless `{ id, apply }` object in its own file and is registered through typed ids.

**Tech Stack:** TypeScript, Node.js, `bpmn-moddle`, `camunda-bpmn-moddle`, Vitest, `tsx`.

---

### Task 1: Typed Pipeline Scaffold

**Files:**
- Create: `src/optimizations/ids.ts`
- Create: `src/optimizations/types.ts`
- Create: `src/optimizations/pipeline.ts`
- Create: `src/optimizations/registry.ts`
- Modify: `src/config.ts`
- Modify: `src/convert.ts`
- Modify: `test/config.test.ts`
- Create: `test/optimizations.test.ts`

- [ ] **Step 1: Write failing tests**

Assert `getPresetConfig('optimized').optimizations?.enabled` equals:

```ts
[
  OPTIMIZATION_IDS.compactElementMeta,
  OPTIMIZATION_IDS.compactCallMappings,
  OPTIMIZATION_IDS.compactFlows,
  OPTIMIZATION_IDS.compactConditions,
  OPTIMIZATION_IDS.omitRedundantGraphRefs,
  OPTIMIZATION_IDS.omitTopLevelMetadata
]
```

Assert `applyOptimizations(model, [])` returns the original model unchanged and invalid external ids are rejected by config resolution.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- test/config.test.ts test/optimizations.test.ts
```

- [ ] **Step 3: Implement scaffold**

Create typed ids, optimization type, registry, and pipeline. Add no-op optimization modules for each approved id. Change config to use `optimizations.enabled?: OptimizationId[]`.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm test -- test/config.test.ts test/optimizations.test.ts test/convert.test.ts
git add src/optimizations src/config.ts src/convert.ts test/config.test.ts test/optimizations.test.ts
git commit -m "feat: add optimized pipeline registry"
```

### Task 2: `compactElementMeta`

**Files:**
- Create: `src/optimizations/compact-element-meta.ts`
- Modify: `src/optimizations/registry.ts`
- Modify: `test/optimizations.test.ts`
- Modify: `test/convert.test.ts`

- [ ] **Step 1: Write failing tests**

Assert optimized elements use:

```json
{ "meta": "SaveApplication,ServiceTask,Save application,impl=${saveApplicationDelegate}" }
{ "meta": "CallRiskCheck,CallActivity,Run risk check,call=risk-check" }
{ "meta": "StartLoanApplication,StartEvent" }
```

Assert optimized elements no longer emit separate `id`, `type`, `name`, `impl`, or `call` keys when represented in `meta`.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
```

- [ ] **Step 3: Implement optimization**

Move `id`, compacted `type`, optional `name`, service-task implementation, and call activity target into a deterministic CSV-like `meta` string.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
git add src/optimizations test/optimizations.test.ts test/convert.test.ts
git commit -m "feat: add optimized element meta"
```

### Task 3: `compactCallMappings`

**Files:**
- Create: `src/optimizations/compact-call-mappings.ts`
- Modify: `src/optimizations/registry.ts`
- Modify: `test/optimizations.test.ts`
- Modify: `test/convert.test.ts`

- [ ] **Step 1: Write failing tests**

Assert optimized call activity mappings use short keys:

```json
{
  "in": ["applicationId", "applicantName->clientId", "clientId->applicantName", "amount->loanAmount"],
  "out": ["riskScore"]
}
```

Assert optimized output does not contain `camunda:In`, `camunda:Out`, or `extensions` for these simple mappings.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
```

- [ ] **Step 3: Implement optimization**

Convert Base structured extension objects to `in` and `out` arrays with same-name shortening.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
git add src/optimizations test/optimizations.test.ts test/convert.test.ts
git commit -m "feat: compact optimized call mappings"
```

### Task 4: `compactFlows` And `compactConditions`

**Files:**
- Create: `src/optimizations/compact-flows.ts`
- Create: `src/optimizations/compact-conditions.ts`
- Modify: `src/optimizations/registry.ts`
- Modify: `test/optimizations.test.ts`
- Modify: `test/convert.test.ts`

- [ ] **Step 1: Write failing tests**

Assert optimized flows are strings:

```json
[
  "StartLoanApplication,SaveApplication",
  "Gateway_1,Task_Approve,approved,riskScore < 50@feel"
]
```

Assert optimized flows do not emit `id`, `type`, `from`, `to`, `sourceRef`, or `targetRef`.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
```

- [ ] **Step 3: Implement optimizations**

`compactConditions` turns condition objects into strings. `compactFlows` turns each sequence flow into a CSV-like line in order `from,to,name,condition`.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
git add src/optimizations test/optimizations.test.ts test/convert.test.ts
git commit -m "feat: compact optimized flows"
```

### Task 5: Omit Redundant Structures

**Files:**
- Create: `src/optimizations/omit-redundant-graph-refs.ts`
- Create: `src/optimizations/omit-top-level-metadata.ts`
- Modify: `src/optimizations/registry.ts`
- Modify: `test/optimizations.test.ts`
- Modify: `test/convert.test.ts`

- [ ] **Step 1: Write failing tests**

Assert optimized output omits:

```text
definitions
collaborations
incoming
outgoing
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
```

- [ ] **Step 3: Implement omissions**

Remove element-level `incoming`/`outgoing` and top-level `definitions`/`collaborations` from optimized output.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```bash
npm test -- test/optimizations.test.ts test/convert.test.ts
git add src/optimizations test/optimizations.test.ts test/convert.test.ts
git commit -m "feat: omit optimized redundant metadata"
```

### Task 6: Docs, Examples, Metrics, Verification

**Files:**
- Modify: `docs/json-examples/optimized/*.json`
- Modify: `README.md`
- Modify: `docs/ACCEPTANCE.md`
- Modify: `docs/superpowers/specs/2026-06-04-metrics-report-design.md`

- [ ] **Step 1: Regenerate examples**

Run:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/optimized/loan-application-process.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/optimized/risk-check-process.json --preset optimized
```

- [ ] **Step 2: Update docs and metrics**

Run metrics for both examples and update README, acceptance notes, and metrics spec with current values.

- [ ] **Step 3: Full verification**

Run:

```bash
npm test
npm run typecheck
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json --preset optimized
diff tmp/loan-1.json tmp/loan-2.json
rg "BPMNDiagram|BPMNPlane|BPMNShape|BPMNEdge|Bounds|waypoint|bpmndi|dc:|di:|width|height|targetNamespace|isExecutable|historyTimeToLive" tmp/*.json docs/json-examples/**/*.json
npm run metrics -- docs/bpmn-examples/loan-application-process.bpmn
npm run metrics -- docs/bpmn-examples/risk-check-process.bpmn
```

- [ ] **Step 4: Commit docs**

Run:

```bash
git add README.md docs/ACCEPTANCE.md docs/json-examples/optimized docs/superpowers/specs/2026-06-04-metrics-report-design.md docs/superpowers/plans/2026-06-04-optimized-mode.md
git commit -m "docs: update optimized metrics and examples"
```
