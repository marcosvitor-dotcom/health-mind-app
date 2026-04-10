type Listener = (...args: any[]) => void;

const listeners: Record<string, Listener[]> = {};

export const EventEmitter = {
  on(event: string, listener: Listener) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(listener);
    return () => this.off(event, listener);
  },
  off(event: string, listener: Listener) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((l) => l !== listener);
  },
  emit(event: string, ...args: any[]) {
    (listeners[event] || []).forEach((l) => l(...args));
  },
};
