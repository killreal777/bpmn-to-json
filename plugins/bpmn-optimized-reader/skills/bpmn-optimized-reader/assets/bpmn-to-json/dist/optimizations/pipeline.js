import { OPTIMIZATION_REGISTRY } from './registry.js';
export function applyOptimizations(model, enabled = []) {
    return enabled.reduce((current, id) => {
        const optimization = OPTIMIZATION_REGISTRY[id];
        return optimization.apply(current, { id });
    }, model);
}
