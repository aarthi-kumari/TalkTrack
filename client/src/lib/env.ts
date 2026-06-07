/**
 * Browser: use same-origin `/api` so Next.js rewrites proxy to Express (127.0.0.1:5000).
 * Set NEXT_PUBLIC_API_URL only if you need a direct URL (not recommended in dev).
 */
function resolveApiUrl(): string {
	const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

	if (typeof window !== "undefined") {
		if (
			!raw ||
			raw === "http://localhost:5000" ||
			raw === "http://127.0.0.1:5000"
		) {
			return "";
		}
		return raw;
	}

	return raw || "http://127.0.0.1:5000";
}

/** Call at request time from client code (not at module load on the server). */
export function getApiUrl(): string {
	return resolveApiUrl();
}

/** Socket.IO: same-origin in browser (proxied via Next) unless a public URL is set. */
export function getSocketUrl(): string {
	const raw = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() ?? "";

	if (typeof window !== "undefined") {
		if (
			!raw ||
			raw === "http://localhost:5000" ||
			raw === "http://127.0.0.1:5000"
		) {
			return window.location.origin;
		}
		return raw;
	}

	return raw || "http://127.0.0.1:5000";
}

/** @deprecated Use getApiUrl() in fetch calls */
export const API_URL = "";

/** @deprecated Use getSocketUrl() */
export const SOCKET_URL =
	process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://127.0.0.1:5000";

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
