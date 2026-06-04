import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const tsxBin = join('node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

describe('CLI compression config', () => {
  it('prints a built-in config', async () => {
    const { stdout } = await execFileAsync(tsxBin, ['src/cli.ts', '--print-config', 'optimized']);
    const config = JSON.parse(stdout) as { optimizations: Record<string, boolean> };

    expect(config.optimizations.compactServiceTaskImplementation).toBe(true);
    expect(config.optimizations.compactFlowRefs).toBe(true);
  });

  it('writes output with a selected preset', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bpmn-cli-'));
    const output = join(dir, 'loan-optimized.json');

    await execFileAsync(tsxBin, [
      'src/cli.ts',
      'docs/bpmn-examples/loan-application-process.bpmn',
      '-o',
      output,
      '--preset',
      'optimized'
    ]);

    const json = await readFile(output, 'utf8');

    expect(json).not.toContain('"definitions"');
    expect(json).not.toContain('sourceRef');
    expect(json).not.toContain('targetRef');
    expect(json).not.toContain('calledElement');
    expect(json).toContain('"impl"');
  });

  it('loads custom config and honors minified output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bpmn-cli-'));
    const configPath = join(dir, 'compression.json');
    const output = join(dir, 'loan-custom.json');

    await writeFile(configPath, JSON.stringify({
      extends: 'optimized',
      optimizations: { compactTypes: false },
      output: { pretty: false }
    }), 'utf8');

    await execFileAsync(tsxBin, [
      'src/cli.ts',
      'docs/bpmn-examples/loan-application-process.bpmn',
      '-o',
      output,
      '--config',
      configPath
    ]);

    const json = await readFile(output, 'utf8');

    expect(json).toContain('bpmn:ServiceTask');
    expect(json).not.toContain('\n  ');
    expect(json.endsWith('\n')).toBe(true);
  });
});
