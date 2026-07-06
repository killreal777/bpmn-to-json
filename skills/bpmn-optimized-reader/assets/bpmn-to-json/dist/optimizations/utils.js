export function cloneModel(model) {
    return JSON.parse(JSON.stringify(model));
}
export function compactBpmnType(value) {
    if (typeof value !== 'string' || value === '') {
        return undefined;
    }
    return value.startsWith('bpmn:') ? value.slice('bpmn:'.length) : value;
}
export function formatCsvLine(fields) {
    const trimmed = [...fields];
    while (trimmed.length > 0 && !trimmed[trimmed.length - 1]) {
        trimmed.pop();
    }
    return trimmed.map((field) => escapeCsvField(field ?? '')).join(',');
}
export function compactCondition(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (!isRecord(value)) {
        return undefined;
    }
    const body = typeof value.body === 'string' && value.body !== '' ? value.body : undefined;
    const language = typeof value.language === 'string' && value.language !== '' ? value.language : undefined;
    if (!body) {
        return undefined;
    }
    return language ? `${body}@${language}` : body;
}
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function cleanRecord(value) {
    const entries = Object.entries(value).filter(([, item]) => {
        if (item === undefined || item === null || item === '') {
            return false;
        }
        if (Array.isArray(item)) {
            return item.length > 0;
        }
        return !(isRecord(item) && Object.keys(item).length === 0);
    });
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
function escapeCsvField(value) {
    if (!/[",\n\r]/.test(value)) {
        return value;
    }
    return `"${value.replaceAll('"', '""')}"`;
}
