import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getPresetConfig, loadCompressionConfig, resolveCompressionConfig } from './config.js';
import { convertBpmnToJson } from './convert.js';
const USAGE = [
    'Usage:',
    '  npx tsx src/cli.ts <input.bpmn> -o <output.json> [--preset base|optimized] [--config compression.json]',
    '  npx tsx src/cli.ts --print-config base|optimized'
].join('\n');
async function main(args) {
    const { input, output, preset, configPath, printConfig } = parseArgs(args);
    if (printConfig) {
        const config = getPresetConfig(printConfig);
        process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
        return;
    }
    if (!input || !output) {
        throw new Error(USAGE);
    }
    const config = await resolveCliConfig({ preset, configPath });
    const xml = await readFile(input, 'utf8');
    const json = await convertBpmnToJson(xml, { config });
    const jsonText = config.output?.pretty === false
        ? JSON.stringify(json)
        : JSON.stringify(json, null, 2);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${jsonText}\n`, 'utf8');
}
function parseArgs(args) {
    const input = args.find((arg) => !arg.startsWith('-'));
    const outputFlagIndex = args.findIndex((arg) => arg === '-o' || arg === '--output');
    const output = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : undefined;
    const preset = readFlag(args, '--preset');
    const configPath = readFlag(args, '--config');
    const printConfig = readFlag(args, '--print-config');
    if (printConfig) {
        return { printConfig };
    }
    if (!input || !output || output.startsWith('-')) {
        throw new Error(USAGE);
    }
    return { input, output, preset, configPath };
}
async function resolveCliConfig(args) {
    if (args.configPath) {
        return loadCompressionConfig(args.configPath);
    }
    return resolveCompressionConfig(args.preset ? { extends: args.preset } : undefined);
}
function readFlag(args, flag) {
    const index = args.findIndex((arg) => arg === flag);
    if (index < 0) {
        return undefined;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
        throw new Error(`${flag} requires a value`);
    }
    return value;
}
main(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
