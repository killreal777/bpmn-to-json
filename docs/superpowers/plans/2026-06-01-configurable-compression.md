# Configurable Compression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable compression configs and built-in `base`/`max` presets for BPMN compact JSON output.

**Architecture:** Add `src/config.ts` for config types, presets, merge, validation, and JSON loading. Keep BPMN semantic projection in `src/convert.ts`, then apply optimization and field filtering based on resolved config. Extend `src/cli.ts` with `--preset`, `--config`, and `--print-config`.

**Tech Stack:** TypeScript, Node.js, `bpmn-moddle`, `camunda-bpmn-moddle`, `tsx`, `vitest`.

---

## Commit and Push Policy

Implementation must be committed and pushed incrementally by usable feature. A usable feature means tests pass and the repository is in a coherent state.

Commit and push checkpoints:

1. Config types, presets, merge, and validation.
2. Converter support for `base` and `max` presets.
3. Field filtering.
4. CLI flags and config file support.
5. Regenerated examples, metrics, and docs.

At each checkpoint run the relevant tests plus `npm run typecheck`, then:

```bash
git add <changed-files>
git commit -m "<focused message>"
git push
```

## File Structure

- Create `src/config.ts`: preset definitions, config resolution, deep merge, validation, JSON file loading.
- Modify `src/convert.ts`: accept conversion options and apply config-driven optimizations.
- Modify `src/cli.ts`: parse `--preset`, `--config`, `--print-config`, pretty/minified output.
- Modify `test/convert.test.ts`: preserve default/base behavior and add max/custom config behavior.
- Create `test/config.test.ts`: test config resolution, merge, validation, and field exclusion.
- Create `test/cli.test.ts`: test `--print-config` and CLI config wiring.
- Create `docs/json-examples/base/*.json`: generated base outputs.
- Create `docs/json-examples/max/*.json`: generated max outputs.
- Modify `README.md`, `docs/ACCEPTANCE.md`, `AGENTS.md`: document configs, presets, metrics, verification.

## Task 1: Config Types and Presets

**Files:**
- Create: `src/config.ts`
- Create: `test/config.test.ts`

- [ ] **Step 1: Write failing tests for built-in presets**

Add tests that import `getPresetConfig`, `resolveCompressionConfig`, and `PRESET_NAMES`.

Test expectations:

```ts
expect(PRESET_NAMES).toEqual(['base', 'max']);
expect(getPresetConfig('base').optimizations?.compactMappings).toBe(true);
expect(getPresetConfig('base').output?.pretty).toBe(true);
expect(getPresetConfig('max').optimizations).toMatchObject({
  compactMappings: true,
  compactSameNameMappings: true,
  compactServiceTaskImplementation: true,
  compactTypes: true,
  compactFlowRefs: true,
  compactCallActivity: true,
  compactConditions: true,
  omitIncomingOutgoing: true,
  omitDefinitions: true
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- test/config.test.ts
```

Expected: FAIL because `src/config.ts` does not exist.

- [ ] **Step 3: Implement minimal config module**

Create:

- `CompressionPresetName = 'base' | 'max'`
- `CompressionConfig`
- `PRESET_NAMES`
- `BUILT_IN_PRESETS`
- `getPresetConfig(name)`
- `resolveCompressionConfig(input?)`

`resolveCompressionConfig()` defaults to `base`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- test/config.test.ts
npm run typecheck
```

Expected: PASS.

## Task 2: Config Merge, Extends, and Validation

**Files:**
- Modify: `src/config.ts`
- Modify: `test/config.test.ts`

- [ ] **Step 1: Write failing tests for `extends` and overrides**

Add tests:

```ts
const config = resolveCompressionConfig({
  extends: 'max',
  optimizations: { compactTypes: false },
  output: { pretty: false },
  fields: { exclude: ['collaborations'] }
});

expect(config.optimizations?.compactServiceTaskImplementation).toBe(true);
expect(config.optimizations?.compactTypes).toBe(false);
expect(config.output?.pretty).toBe(false);
expect(config.fields?.exclude).toEqual(['collaborations']);
```

Add validation tests:

- unknown preset throws `Unknown compression preset`;
- config that is not object throws `Compression config must be an object`.

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- test/config.test.ts
```

Expected: FAIL until merge and validation exist.

- [ ] **Step 3: Implement merge and validation**

Implement shallow nested merge for `fields`, `optimizations`, and `output`.

Rules:

- `extends` selects preset base.
- user values override preset values.
- arrays replace arrays.
- unknown top-level keys are ignored for MVP.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- test/config.test.ts
npm run typecheck
```

Expected: PASS.

## Task 3: Base Preset Wiring in Converter

**Files:**
- Modify: `src/convert.ts`
- Modify: `test/convert.test.ts`

- [ ] **Step 1: Write tests showing default equals base**

Add a test that converts `loan-application-process.bpmn` three ways:

```ts
const defaultResult = await convertBpmnToJson(xml);
const baseByName = await convertBpmnToJson(xml, { preset: 'base' });
const baseByConfig = await convertBpmnToJson(xml, { config: getPresetConfig('base') });
expect(defaultResult).toEqual(baseByName);
expect(defaultResult).toEqual(baseByConfig);
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- test/convert.test.ts
```

Expected: FAIL because converter does not accept options.

- [ ] **Step 3: Implement converter options**

Add:

```ts
type ConvertOptions = {
  preset?: CompressionPresetName;
  config?: CompressionConfig;
};
```

Resolve config at the beginning of `convertBpmnToJson`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- test/convert.test.ts test/config.test.ts
npm run typecheck
```

Expected: PASS.

## Task 4: Max Preset Optimizations

**Files:**
- Modify: `src/convert.ts`
- Modify: `test/convert.test.ts`

- [ ] **Step 1: Write failing max preset test**

Use `loan-application-process.bpmn` and assert `preset: 'max'` output:

- no top-level `definitions`;
- no `incoming` or `outgoing` in elements;
- types are `ServiceTask`, `CallActivity`, `StartEvent`, `EndEvent`, `SequenceFlow`;
- service tasks have `impl` instead of `execution`;
- call activity uses `call` instead of `calledElement`;
- flows use `from` and `to` instead of `sourceRef` and `targetRef`;
- same-name mappings use one token.

Expected shape for `CallRiskCheck`:

```ts
expect(callRiskCheck).toMatchObject({
  id: 'CallRiskCheck',
  type: 'CallActivity',
  call: 'risk-check',
  extensions: {
    'camunda:In': ['applicationId', 'applicantName->clientId', 'clientId->applicantName', 'amount->loanAmount'],
    'camunda:Out': ['riskScore']
  }
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- test/convert.test.ts
```

Expected: FAIL because max optimizations are not applied.

- [ ] **Step 3: Implement optimization helpers**

Implement:

- `compactType(type, config)`
- `compactMapping(source, target, config)`
- `projectImplementation(element, execution, config)`
- `projectCalledElement(element, config)`
- `projectFlowRefs(flow, config)`
- `projectCondition(expression, config)`
- omission of `incoming/outgoing` and `definitions` based on config.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- test/convert.test.ts
npm run typecheck
```

Expected: PASS.

## Task 5: Field Exclude Filtering

**Files:**
- Modify: `src/convert.ts`
- Modify: `test/config.test.ts` or `test/convert.test.ts`

- [ ] **Step 1: Write failing field exclude tests**

Add tests:

```ts
const result = await convertBpmnToJson(xml, {
  config: {
    extends: 'base',
    fields: { exclude: ['definitions', 'collaborations', 'elements.incoming', 'elements.outgoing'] }
  }
});
expect(result).not.toHaveProperty('definitions');
expect(result).not.toHaveProperty('collaborations');
expect(JSON.stringify(result)).not.toContain('"incoming"');
expect(JSON.stringify(result)).not.toContain('"outgoing"');
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- test/convert.test.ts
```

Expected: FAIL until filtering exists.

- [ ] **Step 3: Implement field exclusion**

Apply after optimizations and cleanup.

Path behavior:

- exact object key path removes that key;
- paths match through arrays;
- `elements.incoming` removes `incoming` from objects inside any `elements` array.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test
npm run typecheck
```

Expected: PASS.

## Task 6: CLI Preset, Config File, and Print Config

**Files:**
- Modify: `src/cli.ts`
- Create: `test/cli.test.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Write failing CLI tests**

Use `node:child_process` `execFile` or `spawn` to run:

```bash
npx tsx src/cli.ts --print-config max
```

Assert stdout is valid JSON and has max optimizations.

Add CLI smoke with:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/cli-max.json --preset max
```

Assert output does not contain `sourceRef`, `targetRef`, `calledElement`, or `definitions`.

Add custom config fixture inside test using `mkdtemp`:

```json
{
  "extends": "max",
  "optimizations": { "compactTypes": false },
  "output": { "pretty": false }
}
```

Assert output is minified and preserves `bpmn:` type prefixes.

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- test/cli.test.ts
```

Expected: FAIL until CLI flags exist.

- [ ] **Step 3: Implement CLI parsing**

Add parsing for:

- `--preset <name>`;
- `--config <path>`;
- `--print-config <name>`.

For `--print-config`, print JSON and exit without input/output.

For `--config`, load JSON and pass resolved config to converter. If `output.pretty === false`, write minified JSON with trailing newline.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm test -- test/cli.test.ts
npm run typecheck
```

Expected: PASS.

## Task 7: Examples, Metrics, and Docs

**Files:**
- Create: `docs/json-examples/base/loan-application-process.json`
- Create: `docs/json-examples/base/risk-check-process.json`
- Create: `docs/json-examples/max/loan-application-process.json`
- Create: `docs/json-examples/max/risk-check-process.json`
- Modify: `README.md`
- Modify: `docs/ACCEPTANCE.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Regenerate examples**

Run:

```bash
mkdir -p docs/json-examples/base docs/json-examples/max
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/base/loan-application-process.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/base/risk-check-process.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/max/loan-application-process.json --preset max
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/max/risk-check-process.json --preset max
```

- [ ] **Step 2: Calculate metrics**

Run:

```bash
node --input-type=module - <<'NODE'
import { statSync } from 'node:fs';
const rows = [
  ['loan base', 'docs/bpmn-examples/loan-application-process.bpmn', 'docs/json-examples/base/loan-application-process.json'],
  ['loan max', 'docs/bpmn-examples/loan-application-process.bpmn', 'docs/json-examples/max/loan-application-process.json'],
  ['risk base', 'docs/bpmn-examples/risk-check-process.bpmn', 'docs/json-examples/base/risk-check-process.json'],
  ['risk max', 'docs/bpmn-examples/risk-check-process.bpmn', 'docs/json-examples/max/risk-check-process.json']
];
for (const [name, input, output] of rows) {
  const source = statSync(input).size;
  const json = statSync(output).size;
  console.log(`${name}\\t${source}\\t${json}\\t${(source / json).toFixed(2)}x\\t${((1 - json / source) * 100).toFixed(1)}%`);
}
NODE
```

- [ ] **Step 3: Update docs**

Document:

- `--preset`;
- `--config`;
- `--print-config`;
- example custom config;
- base and max metrics;
- verification commands.

- [ ] **Step 4: Run docs verification**

Run:

```bash
jq . docs/json-examples/base/*.json docs/json-examples/max/*.json >/dev/null
```

Expected: PASS.

## Task 8: Final Verification

**Files:**
- No new files unless fixing issues.

- [ ] **Step 1: Full test and typecheck**

Run:

```bash
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: CLI determinism check**

Run:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-max-1.json --preset max
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-max-2.json --preset max
diff tmp/loan-max-1.json tmp/loan-max-2.json
```

Expected: diff is empty.

- [ ] **Step 3: Forbidden-string scan**

Run:

```bash
rg "BPMNDiagram|BPMNPlane|BPMNShape|BPMNEdge|Bounds|waypoint|bpmndi|dc:|di:|width|height|targetNamespace|isExecutable|historyTimeToLive|asyncBefore|asyncAfter|exclusive" docs/json-examples/**/*.json tmp/*.json
```

Expected: no matches.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git status --short
git add src test docs README.md AGENTS.md
git commit -m "feat: add configurable compression presets"
```

Expected: commit succeeds.
