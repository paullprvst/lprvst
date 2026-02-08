interface CacheEntry<T> {
	value: T;
	timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getTabCache<T>(key: string, ttlMs: number): T | null {
	const entry = cache.get(key);
	if (!entry) return null;

	if (Date.now() - entry.timestamp > ttlMs) {
		cache.delete(key);
		return null;
	}

	return entry.value as T;
}

export function setTabCache<T>(key: string, value: T): void {
	cache.set(key, { value, timestamp: Date.now() });
}

export function clearTabCache(key?: string): void {
	if (key) {
		cache.delete(key);
		return;
	}
	cache.clear();
}
