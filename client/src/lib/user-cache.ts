import type { DbUser } from "@/lib/api";

const CACHE_KEY = "meeting-ai-db-user";

export function readCachedDbUser(): DbUser | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(CACHE_KEY);
		return raw ? (JSON.parse(raw) as DbUser) : null;
	} catch {
		return null;
	}
}

export function writeCachedDbUser(user: DbUser | null): void {
	if (typeof window === "undefined") return;
	if (user) {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
	} else {
		sessionStorage.removeItem(CACHE_KEY);
	}
}
