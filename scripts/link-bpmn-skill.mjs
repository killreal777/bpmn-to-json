import { lstat, mkdir, readlink, rm, symlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repoRoot, 'skills/bpmn-optimized-reader');
const codexHome = process.env.CODEX_HOME || resolve(homedir(), '.codex');
const skillsDir = resolve(codexHome, 'skills');
const target = resolve(skillsDir, 'bpmn-optimized-reader');
const replace = process.argv.includes('--replace');

await mkdir(skillsDir, { recursive: true });

try {
  const stat = await lstat(target);
  if (stat.isSymbolicLink()) {
    const current = resolve(dirname(target), await readlink(target));
    if (current === source) {
      console.log(`Skill already linked: ${target} -> ${source}`);
      process.exit(0);
    }
  }

  if (!replace) {
    throw new Error(`Target already exists: ${target}\nRun npm run link:skill -- --replace to replace it.`);
  }

  await rm(target, { recursive: true, force: true });
} catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
    throw error;
  }
}

await symlink(source, target, 'dir');
console.log(`Linked skill: ${target} -> ${source}`);
