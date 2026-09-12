// Simple in-memory store for tool comparison (max 2 tools at a time)

type Listener = () => void;

let _ids: string[] = [];
const _listeners = new Set<Listener>();

const notify = () => _listeners.forEach(fn => fn());

export const compareStore = {
  /** Returns a copy of the current comparison IDs */
  getIds: (): string[] => [..._ids],

  /** Returns true if the given tool ID is in the comparison */
  has: (id: string): boolean => _ids.includes(id),

  /** Adds a tool ID. If already 2 exist, drops the oldest one. */
  add: (id: string): void => {
    if (_ids.includes(id)) return;
    _ids = _ids.length >= 2 ? [_ids[1], id] : [..._ids, id];
    notify();
  },

  /** Removes a tool ID */
  remove: (id: string): void => {
    _ids = _ids.filter(i => i !== id);
    notify();
  },

  /** Clears all comparison IDs */
  clear: (): void => {
    _ids = [];
    notify();
  },

  /** Subscribe to store changes. Returns an unsubscribe function. */
  subscribe: (fn: Listener): (() => void) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
