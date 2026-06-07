export function meetingPath(roomId: string): string {
	return `/meet/${roomId}`;
}

/** Accept a raw room ID, path, or full meeting URL and return the room ID segment. */
export function parseMeetingRoomId(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	if (/^https?:\/\//i.test(trimmed)) {
		try {
			const url = new URL(trimmed);
			const fromPath = url.pathname.match(/\/meet\/([^/]+)/);
			if (fromPath?.[1]) return decodeURIComponent(fromPath[1]);
		} catch {
			// fall through
		}
	}

	const fromPath = trimmed.match(/\/meet\/([^/?#]+)/);
	if (fromPath?.[1]) return decodeURIComponent(fromPath[1]);

	return trimmed;
}

export function meetingJoinUrl(roomId: string): string {
	if (typeof window !== "undefined") {
		return `${window.location.origin}${meetingPath(roomId)}`;
	}
	return meetingPath(roomId);
}

export async function copyMeetingLink(roomId: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(meetingJoinUrl(roomId));
		return true;
	} catch {
		return false;
	}
}
