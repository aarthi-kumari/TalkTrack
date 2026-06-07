import { getApiUrl } from "./env";

/** Fail fast instead of hanging when the API or DB is unreachable */
export const API_TIMEOUT_MS = 10_000;

export type DbUser = {
	id: string;
	clerkUserId: string;
	email: string;
	name: string | null;
	createdAt: string;
};

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public code?: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

function parseErrorMessage(data: Record<string, unknown>, status: number): string {
	if (typeof data.message === "string") return data.message;
	if (typeof data.error === "string") return data.error;
	const clerkErrors = data.errors as { message?: string }[] | undefined;
	if (clerkErrors?.[0]?.message) return clerkErrors[0].message;
	return `Request failed (${status})`;
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit & { token: string | null },
): Promise<T> {
	const { token, ...init } = options;

	const headers = new Headers(init.headers);
	headers.set("Content-Type", "application/json");
	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	const base = getApiUrl();
	let res: Response;
	try {
		res = await fetch(`${base}${path}`, {
			...init,
			headers,
			signal: init.signal ?? AbortSignal.timeout(API_TIMEOUT_MS),
		});
	} catch (err) {
		if (err instanceof Error && err.name === "TimeoutError") {
			throw new ApiError(
				"API request timed out. Check that the server is running and the database is reachable.",
				0,
				"TIMEOUT",
			);
		}
		throw new ApiError(
			"Cannot reach API. In a second terminal run: cd server && npm run dev (wait for port 5000), then refresh.",
			0,
			"NETWORK_ERROR",
		);
	}

	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

	if (!res.ok) {
		const isProxyOrServerDown =
			res.status >= 500 &&
			Object.keys(data).length === 0 &&
			!data.message &&
			!data.error;

		if (isProxyOrServerDown) {
			throw new ApiError(
				"API server is not running. From the project root run: npm run dev (starts server + client).",
				0,
				"NETWORK_ERROR",
			);
		}

		throw new ApiError(
			parseErrorMessage(data, res.status),
			res.status,
			typeof data.code === "string" ? data.code : undefined,
		);
	}

	return data as T;
}

export async function syncUser(token: string) {
	return apiFetch<{ user: DbUser }>("/api/users/sync", {
		method: "POST",
		token,
		body: JSON.stringify({}),
	});
}

export async function getCurrentUser(token: string) {
	return apiFetch<{ user: DbUser }>("/api/users/me", {
		method: "GET",
		token,
	});
}

export type MeetingHost = {
	id: string;
	name: string | null;
	email: string;
};

export type Meeting = {
	id: string;
	title: string;
	roomId: string;
	hostId: string;
	startedAt: string;
	endedAt: string | null;
	host?: MeetingHost;
};

export async function getMeetings(token: string) {
	return apiFetch<Meeting[]>("/api/meetings", {
		method: "GET",
		token,
	});
}

export async function createMeeting(token: string, title: string) {
	return apiFetch<Meeting>("/api/meetings", {
		method: "POST",
		token,
		body: JSON.stringify({ title }),
	});
}

export async function getMeetingByRoom(token: string, roomId: string) {
	return apiFetch<Meeting>(`/api/meetings/room/${roomId}`, {
		method: "GET",
		token,
	});
}

export async function endMeeting(token: string, meetingId: string) {
	return apiFetch<Meeting>(`/api/meetings/${meetingId}/end`, {
		method: "PATCH",
		token,
		body: JSON.stringify({}),
	});
}

export async function getLiveKitStatus() {
	return apiFetch<{
		configured: boolean;
		url: string | null;
		missing: string[];
	}>("/api/livekit/status", {
		method: "GET",
		token: null,
	});
}

export async function getLiveKitToken(token: string, roomId: string) {
	return apiFetch<{ token: string; url: string; roomName: string }>(
		"/api/livekit/token",
		{
			method: "POST",
			token,
			body: JSON.stringify({ roomId }),
		},
	);
}

export type MessageRole = "USER" | "AI" | "SYSTEM";

export type ChatMessage = {
	id: string;
	meetingId: string;
	senderId: string;
	userId: string | null;
	role: MessageRole;
	content: string;
	createdAt: string;
	sender: {
		id: string;
		name: string | null;
		email: string;
	};
};

export async function getMeetingMessages(
	token: string,
	roomId: string,
	cursor?: string,
) {
	const params = new URLSearchParams();
	if (cursor) params.set("cursor", cursor);

	const query = params.toString();
	const path = `/api/meetings/room/${roomId}/messages${query ? `?${query}` : ""}`;

	return apiFetch<{ messages: ChatMessage[]; nextCursor: string | null }>(
		path,
		{ method: "GET", token },
	);
}
