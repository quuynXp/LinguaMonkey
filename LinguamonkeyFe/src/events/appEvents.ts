type Handler = (payload?: any) => void;
const handlers: Record<string, Handler[]> = {};

const eventBus = {
    on: (name: string, fn: Handler) => {
        handlers[name] = handlers[name] || [];
        handlers[name].push(fn);
    },
    off: (name: string, fn?: Handler) => {
        if (!handlers[name]) return;
        if (!fn) { handlers[name] = []; return; }
        handlers[name] = handlers[name].filter(h => h !== fn);
    },
    emit: (name: string, payload?: any) => {
        (handlers[name] || []).forEach(h => {
            try { h(payload); } catch (e) { console.error('[eventBus] handler error', e); }
        });
    }
};
export default eventBus;
