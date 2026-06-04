import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { PRESET_NAMES } from '../src/config.js';
import {
  calculateMetrics,
  createMetricsReport,
  formatMetricsReport
} from '../src/metrics.js';

const execFileAsync = promisify(execFile);
const tsxBin = join('node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

describe('metrics report', () => {
  it('calculates byte ratio and reduction', () => {
    expect(calculateMetrics(100, 25)).toEqual({
      outputBytes: 25,
      ratio: 4,
      reduction: 75
    });
  });

  it('creates a report for every preset', async () => {
    const inputPath = 'test/fixtures/simple-linear.bpmn';
    const xml = await readFile(inputPath, 'utf8');
    const report = await createMetricsReport(inputPath, xml);

    expect(report.inputPath).toBe(inputPath);
    expect(report.sourceBytes).toBe(Buffer.byteLength(xml, 'utf8'));
    expect(report.rows.map((row) => row.preset)).toEqual([...PRESET_NAMES]);

    for (const row of report.rows) {
      expect(row.outputBytes).toBeGreaterThan(0);
      expect(row.ratio).toBeGreaterThan(1);
      expect(row.reduction).toBeGreaterThan(0);
    }
  });

  it('formats a terminal report with source and preset metrics', async () => {
    const inputPath = 'test/fixtures/simple-linear.bpmn';
    const xml = await readFile(inputPath, 'utf8');
    const formatted = formatMetricsReport(await createMetricsReport(inputPath, xml));

    expect(formatted).toContain(`Input: ${inputPath}`);
    expect(formatted).toContain(`Source BPMN: ${Buffer.byteLength(xml, 'utf8').toLocaleString('en-US')} bytes`);
    expect(formatted).toContain('Preset');
    expect(formatted).toContain('Output bytes');
    expect(formatted).toContain('Ratio');
    expect(formatted).toContain('Reduction');

    for (const preset of PRESET_NAMES) {
      expect(formatted).toContain(preset);
    }
  });
});

describe('metrics CLI', () => {
  it('is exposed through an npm script', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.metrics).toBe('tsx src/metrics.ts');
  });

  it('prints usage and exits non-zero without an input path', async () => {
    await expect(execFileAsync(tsxBin, ['src/metrics.ts'])).rejects.toMatchObject({
      stderr: expect.stringContaining('Usage:')
    });
  });

  it('prints metrics for every preset', async () => {
    const inputPath = 'test/fixtures/simple-linear.bpmn';
    const { stdout } = await execFileAsync(tsxBin, ['src/metrics.ts', inputPath]);

    expect(stdout).toContain(`Input: ${inputPath}`);
    expect(stdout).toContain('Source BPMN:');

    for (const preset of PRESET_NAMES) {
      expect(stdout).toContain(preset);
    }
  });
});
