import { DeepgramClient } from "@deepgram/sdk";

import { getDeepgramApiKey } from "../lib/deepgram-config";
import { createTranscriptEntry } from "./meeting-transcript";

export type TranscriptResultHandler = (chunk: {
	speaker: string;
	speakerId: string;
	text: string;
	isFinal: boolean;
	timestamp: string;
	id?: string;
}) => void;

type SessionMeta = {
	meetingId: string;
	speaker: string;
	speakerId: string;
	onResult: TranscriptResultHandler;
	onClose?: () => void;
};

type DeepgramLiveConnection = Awaited<
	ReturnType<DeepgramClient["listen"]["v1"]["connect"]>
>;

type SessionRecord = {
	connection: DeepgramLiveConnection;
	keepAliveTimer: ReturnType<typeof setInterval>;
	onClose?: () => void;
};

const sessions = new Map<string, SessionRecord>();

/** WebSocket ReadyState.OPEN */
const WS_OPEN = 1;

function getClient() {
	const apiKey = getDeepgramApiKey();
	if (!apiKey) {
		throw new Error("DEEPGRAM_API_KEY is not configured");
	}
	return { client: new DeepgramClient({ apiKey }), apiKey };
}

function isConnectionOpen(connection: DeepgramLiveConnection): boolean {
	try {
		return connection.readyState === WS_OPEN;
	} catch {
		return false;
	}
}

function removeSession(
	socketId: string,
	notifyClose = true,
): SessionRecord | undefined {
	const record = sessions.get(socketId);
	if (!record) return undefined;

	clearInterval(record.keepAliveTimer);
	sessions.delete(socketId);
	if (notifyClose) {
		record.onClose?.();
	}
	return record;
}

export async function startDeepgramSession(
	socketId: string,
	meta: SessionMeta,
	sampleRate = 48_000,
): Promise<void> {
	await stopDeepgramSession(socketId);

	const { client, apiKey } = getClient();
	const connection = await client.listen.v1.connect({
		model: "nova-2",
		language: "en-US",
		smart_format: "true",
		interim_results: "true",
		punctuate: "true",
		encoding: "linear16",
		sample_rate: String(sampleRate),
		Authorization: `Token ${apiKey}`,
	});

	const handleClose = () => {
		removeSession(socketId, true);
	};

	connection.on("message", (data) => {
		if (data.type !== "Results") return;

		const text = data.channel.alternatives[0]?.transcript?.trim() ?? "";
		if (!text) return;

		const isFinal = Boolean(data.is_final);
		const timestamp = new Date().toISOString();

		if (isFinal) {
			void createTranscriptEntry({
				meetingId: meta.meetingId,
				speaker: meta.speaker,
				text,
				timestamp: new Date(timestamp),
			})
				.then((saved) => {
					meta.onResult({
						speaker: meta.speaker,
						speakerId: meta.speakerId,
						text,
						isFinal: true,
						timestamp: saved.timestamp,
						id: saved.id,
					});
				})
				.catch((err) => {
					console.error("Failed to save transcript:", err);
					meta.onResult({
						speaker: meta.speaker,
						speakerId: meta.speakerId,
						text,
						isFinal: true,
						timestamp,
					});
				});
			return;
		}

		meta.onResult({
			speaker: meta.speaker,
			speakerId: meta.speakerId,
			text,
			isFinal: false,
			timestamp,
		});
	});

	connection.on("error", (err) => {
		console.error("Deepgram session error:", err);
		handleClose();
	});

	connection.on("close", handleClose);

	connection.connect();
	await connection.waitForOpen();

	const keepAliveTimer = setInterval(() => {
		const record = sessions.get(socketId);
		if (!record || !isConnectionOpen(record.connection)) {
			handleClose();
			return;
		}

		try {
			record.connection.sendKeepAlive({ type: "KeepAlive" });
		} catch {
			handleClose();
		}
	}, 8_000);

	sessions.set(socketId, {
		connection,
		keepAliveTimer,
		onClose: meta.onClose,
	});
}

export function sendDeepgramAudio(socketId: string, audio: Buffer): void {
	const record = sessions.get(socketId);
	if (!record || !isConnectionOpen(record.connection)) {
		if (record) removeSession(socketId, true);
		return;
	}

	try {
		record.connection.sendMedia(audio);
	} catch (err) {
		const message = err instanceof Error ? err.message : "send failed";
		console.warn(`Deepgram audio skipped for ${socketId}: ${message}`);
		removeSession(socketId, true);
	}
}

export async function stopDeepgramSession(socketId: string): Promise<void> {
	const record = removeSession(socketId, false);
	if (!record) return;

	try {
		if (isConnectionOpen(record.connection)) {
			record.connection.sendFinalize({ type: "Finalize" });
		}
	} catch {
		// ignore
	}

	try {
		record.connection.close();
	} catch {
		// ignore
	}
}

export function hasDeepgramSession(socketId: string): boolean {
	const record = sessions.get(socketId);
	return Boolean(record && isConnectionOpen(record.connection));
}
