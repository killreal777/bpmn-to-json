import { execFile } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const packageRoot = 'plugins/bpmn-optimized-reader';
const packagedSkill = `${packageRoot}/skills/bpmn-optimized-reader`;
const converterAsset = `${packagedSkill}/assets/bpmn-to-json`;

describe('installable agent package', () => {
  it('declares the plugin package as the marketplace install target', async () => {
    const marketplace = JSON.parse(await readFile('.agents/plugins/marketplace.json', 'utf8')) as {
      plugins: Array<{
        name: string;
        source: { source: string; path: string };
        policy: { installation: string; authentication: string };
        category: string;
      }>;
    };

    expect(marketplace.plugins).toContainEqual({
      name: 'bpmn-optimized-reader',
      source: {
        source: 'local',
        path: './plugins/bpmn-optimized-reader'
      },
      policy: {
        installation: 'AVAILABLE',
        authentication: 'ON_INSTALL'
      },
      category: 'Productivity'
    });
  });

  it('is self-contained for Qwen Code and Claude Code installation from the plugin directory', async () => {
    const qwenExtension = JSON.parse(await readFile(`${packageRoot}/qwen-extension.json`, 'utf8')) as {
      name: string;
      skills: string;
    };
    const claudePlugin = JSON.parse(await readFile(`${packageRoot}/.claude-plugin/plugin.json`, 'utf8')) as {
      name: string;
      skills: string;
    };

    expect(qwenExtension).toMatchObject({
      name: 'bpmn-optimized-reader',
      skills: 'skills'
    });
    expect(claudePlugin).toMatchObject({
      name: 'bpmn-optimized-reader',
      skills: './skills/'
    });
    await expect(readFile(`${packagedSkill}/SKILL.md`, 'utf8')).resolves.toContain('BPMN Optimized Reader');
    await expect(readFile(`${converterAsset}/dist/cli.js`, 'utf8')).resolves.toContain('preset');
    await expect(readFile(`${converterAsset}/dist/metrics.js`, 'utf8')).resolves.toContain('formatMetricsReport');
    await expect(readFile(`${converterAsset}/package-lock.json`, 'utf8')).resolves.toContain('bpmn-moddle');
  });

  it('runs the bundled converter from the package assets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bpmn-plugin-package-'));
    const output = join(dir, 'loan.optimized.json');

    await execFileAsync('node', [
      `${converterAsset}/dist/cli.js`,
      'docs/bpmn-examples/loan-application-process.bpmn',
      '-o',
      output,
      '--preset',
      'optimized'
    ]);

    const json = await readFile(output, 'utf8');

    expect(json).toContain('"meta"');
    expect(json).toContain('saveApplicationDelegate');
    expect(json).not.toMatch(/(?:camunda|camunca|bpmn):/i);
    expect(json).not.toContain('BPMNDiagram');
  });

  it('documents subdirectory installation as the supported remote install path', async () => {
    const readme = await readFile(`${packageRoot}/README.md`, 'utf8');

    expect(readme).toContain('plugins/bpmn-optimized-reader');
    expect(readme).toContain('/extensions install');
    expect(readme).toContain('/plugins');
  });
});
