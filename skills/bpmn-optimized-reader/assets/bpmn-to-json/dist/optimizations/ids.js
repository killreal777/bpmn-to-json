export const OPTIMIZATION_IDS = {
    compactElementMeta: 'compactElementMeta',
    compactCallMappings: 'compactCallMappings',
    compactFlows: 'compactFlows',
    compactConditions: 'compactConditions',
    omitRedundantGraphRefs: 'omitRedundantGraphRefs',
    omitTopLevelMetadata: 'omitTopLevelMetadata',
    stripNamespacePrefixes: 'stripNamespacePrefixes'
};
export const OPTIMIZATION_ID_VALUES = Object.values(OPTIMIZATION_IDS);
export function isOptimizationId(value) {
    return OPTIMIZATION_ID_VALUES.includes(value);
}
