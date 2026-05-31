import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('CLI compression config', () => {
  it('prints a built-in config', async () => {
    const { stdout } = await execFileAsync('npx', ['tsx', 'src/cli.ts', '--print-config', 'max']);
    const config = JSON.parse(stdout) as { optimizations: Record<string, boolean> };

    expect(config.optimizations.compactServiceTaskImplementation).toBe(true);
    expect(config.optimizations.compactFlowRefs).toBe(true);
  });

  it('writes output with a selected preset', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bpmn-cli-'));
    const output = join(dir, 'loan-max.json');

    await execFileAsync('npx', [
      'tsx',
      'src/cli.ts',
      'docs/bpmn-examples/loan-application-process.bpmn',
      '-o',
      output,
      '--preset',
      'max'
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
      extends: 'max',
      optimizations: { compactTypes: false },
      output: { pretty: false }
    }), 'utf8');

    await execFileAsync('npx', [
      'tsx',
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
