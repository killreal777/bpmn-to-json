# BPMN Metrics Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a console metrics command that reports compression efficiency for every available preset on one BPMN file.

**Architecture:** Create `src/metrics.ts` as a separate CLI entrypoint. It will read BPMN XML, run each preset from `PRESET_NAMES`, serialize the converted output using the preset's pretty/minified config, calculate UTF-8 byte metrics, and print a terminal table.

**Tech Stack:** TypeScript, Node.js `fs/promises`, `Buffer.byteLength`, `tsx`, Vitest.

---

### Task 1: Metrics Calculation And Formatting

**Files:**
- Create: `src/metrics.ts`
- Test: `test/metrics.test.ts`

- [ ] **Step 1: Write failing tests for metrics calculation and console report**

Create `test/metrics.test.ts` with tests that import `createMetricsReport` from `../src/metrics.js`, read `test/fixtures/simple-linear.bpmn`, and assert that the report contains the input path, source bytes, every preset from `PRESET_NAMES`, ratios, and reductions.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- test/metrics.test.ts
```

Expected: fail because `src/metrics.ts` does not exist.

- [ ] **Step 3: Implement metrics calculation and formatting**

Create `src/metrics.ts` with:

- `calculateMetrics(sourceBytes, outputBytes)`;
- `createMetricsReport(inputPath, xml)`;
- `formatMetricsReport(report)`;
- a CLI `main(args)` that reads one input path and prints the formatted report.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/metrics.test.ts
```

Expected: pass.

### Task 2: CLI Script Wiring

**Files:**
- Modify: `package.json`
- Test: `test/metrics.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Extend `test/metrics.test.ts` with `execFileAsync` tests:

- `tsx src/metrics.ts` exits non-zero and prints usage;
- `tsx src/metrics.ts test/fixtures/simple-linear.bpmn` prints a report with all presets.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- test/metrics.test.ts
```

Expected: fail until CLI behavior and npm script are wired.

- [ ] **Step 3: Add npm script**

Modify `package.json`:

```json
"metrics": "tsx src/metrics.ts"
```

- [ ] **Step 4: Run metrics test and command**

Run:

```bash
npm test -- test/metrics.test.ts
npm run metrics -- docs/bpmn-examples/loan-application-process.bpmn
```

Expected: tests pass and the command prints source bytes plus one row per preset.

### Task 3: Verification And Commit

**Files:**
- Modified implementation and tests from Tasks 1-2

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run metrics -- docs/bpmn-examples/loan-application-process.bpmn
```

Expected: tests and typecheck pass, metrics report prints successfully.

- [ ] **Step 2: Commit feature**

Run:

```bash
git add package.json src/metrics.ts test/metrics.test.ts docs/superpowers/plans/2026-06-04-metrics-report.md
git commit -m "feat: add metrics report command"
```
