import type { Server, Socket } from "socket.io";

import {
	createMeetingMessage,
	getMeetingByRoomId,
	getMeetingMessageHistory,
	markParticipantLeft,
	upsertMeetingParticipant,
} from "../services/meeting-chat";
import {
	getDeepgramConfigStatus,
} from "../lib/deepgram-config";
import {
	hasDeepgramSession,
	sendDeepgramAudio,
	startDeepgramSession,
	stopDeepgramSession,
} from "../services/deepgram-session";
import { getMeetingTranscriptHistory } from "../services/meeting-transcript";
import {
	getMeetingNoteByRoomId,
	refreshMeetingNotesFromTranscripts,
	upsertManualNoteForRoomId,
} from "../services/notes.service";
import { answerMeetingAssistantQuestion } from "../services/ai-assistant.service";
import { authenticateSocket } from "./auth";
import type {
	AiAssistantMessage,
	ClientToServerEvents,
	PresenceUser,
	ServerToClientEvents,
	SocketUserData,
} from "./types";

const meetingRoom = (roomId: string) => `room:${roomId}`;

/** Active socket presence per meeting roomId */
const presenceByRoom = new Map<string, Map<string, PresenceUser>>();
/** userId -> displayName for users currently typing */
const typingByRoom = new Map<string, Map<string, string>>();

/** Debounced passive note refresh per meetingId */
const notesRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getPresenceList(roomId: string): PresenceUser[] {
	const byUser = new Map<string, PresenceUser>();
	for (const user of presenceByRoom.get(roomId)?.values() ?? []) {
		byUser.set(user.userId, user);
	}
	return Array.from(byUser.values());
}

function getTypingNames(roomId: string, excludeUserId?: string): string[] {
	const map = typingByRoom.get(roomId);
	if (!map) return [];

	return [...map.entries()]
		.filter(([userId]) => userId !== excludeUserId)
		.map(([, name]) => name);
}

function emitPresence(
	io: Server<ClientToServerEvents, ServerToClientEvents>,
	roomId: string,
) {
	io.to(meetingRoom(roomId)).emit("presence_updated", {
		participants: getPresenceList(roomId),
	});
}

function emitTyping(
	io: Server<ClientToServerEvents, ServerToClientEvents>,
	roomId: string,
	excludeUserId?: string,
) {
	io.to(meetingRoom(roomId)).emit("typing_update", {
		roomId,
		typingUsers: getTypingNames(roomId, excludeUserId),
	});
}

function scheduleNotesRefresh(
	io: Server<ClientToServerEvents, ServerToClientEvents>,
	params: { roomId: string; meetingId: string },
) {
	const existing = notesRefreshTimers.get(params.meetingId);
	if (existing) clearTimeout(existing);

	const timer = setTimeout(() => {
		void refreshMeetingNotesFromTranscripts({
			roomId: params.roomId,
			meetingId: params.meetingId,
		})
			.then((note) => {
				if (note) {
					io.to(meetingRoom(params.roomId)).emit("note_updated", { note });
				}
			})
			.catch((err) => {
				console.warn("notes refresh failed:", err);
			})
			.finally(() => {
				notesRefreshTimers.delete(params.meetingId);
			});
	}, 30_000);

	notesRefreshTimers.set(params.meetingId, timer);
}

async function leaveRoom(
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>,
	roomId: string,
	user: SocketUserData,
) {
	const channel = meetingRoom(roomId);
	socket.leave(channel);

	presenceByRoom.get(roomId)?.delete(socket.id);
	if (presenceByRoom.get(roomId)?.size === 0) {
		presenceByRoom.delete(roomId);
	}

	typingByRoom.get(roomId)?.delete(user.userId);
	if (typingByRoom.get(roomId)?.size === 0) {
		typingByRoom.delete(roomId);
	}

	const meeting = await getMeetingByRoomId(roomId);
	if (meeting) {
		await markParticipantLeft(meeting.id, user.userId).catch(() => undefined);
	}

	await stopDeepgramSession(socket.id);

	if (socket.data.roomId === roomId) {
		socket.data.roomId = undefined;
	}

	emitPresence(io, roomId);
	emitTyping(io, roomId);
}

export function registerSocketHandlers(
	io: Server<ClientToServerEvents, ServerToClientEvents>,
) {
	io.use(async (socket, next) => {
		try {
			const user = await authenticateSocket(socket);
			Object.assign(socket.data, user);
			next();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unauthorized";
			console.error("Socket auth failed:", message);
			next(new Error(message));
		}
	});

	io.on("connection", (socket) => {
		const user = socket.data as SocketUserData;

		socket.on("join_meeting", async ({ roomId }) => {
			try {
				if (!roomId?.trim()) {
					socket.emit("error", { message: "roomId is required" });
					return;
				}

				const meeting = await getMeetingByRoomId(roomId.trim());
				if (!meeting) {
					socket.emit("error", { message: "Meeting not found" });
					return;
				}

				if (meeting.endedAt) {
					socket.emit("error", { message: "Meeting has ended" });
					return;
				}

				if (socket.data.roomId && socket.data.roomId !== roomId) {
					await leaveRoom(socket, io, socket.data.roomId, user);
				}

				await upsertMeetingParticipant(meeting.id, user.userId);

				const channel = meetingRoom(roomId);
				await socket.join(channel);
				socket.data.roomId = roomId;

				if (!presenceByRoom.has(roomId)) {
					presenceByRoom.set(roomId, new Map());
				}
				presenceByRoom.get(roomId)!.set(socket.id, {
					userId: user.userId,
					displayName: user.displayName,
					socketId: socket.id,
				});

				const { messages } = await getMeetingMessageHistory(meeting.id);
				socket.emit("message_history", { messages });

				const deepgramStatus = getDeepgramConfigStatus();
				socket.emit("transcription_ready", {
					enabled: deepgramStatus.configured,
				});

				if (deepgramStatus.configured) {
					const transcripts = await getMeetingTranscriptHistory(meeting.id);
					socket.emit("transcript_history", { transcripts });
				}

				const note = await getMeetingNoteByRoomId(roomId.trim()).catch(() => null);
				socket.emit("note_current", { note });

				emitPresence(io, roomId);
			} catch (error) {
				console.error("join_meeting error:", error);
				socket.emit("error", { message: "Failed to join meeting chat" });
			}
		});

		socket.on("leave_meeting", async ({ roomId }) => {
			if (!roomId?.trim()) return;
			await leaveRoom(socket, io, roomId.trim(), user);
		});

		socket.on("send_message", async ({ roomId, content }) => {
			try {
				const text = content?.trim();
				if (!roomId?.trim() || !text) {
					socket.emit("error", { message: "Message cannot be empty" });
					return;
				}

				if (text.length > 4000) {
					socket.emit("error", { message: "Message is too long" });
					return;
				}

				const meeting = await getMeetingByRoomId(roomId.trim());
				if (!meeting) {
					socket.emit("error", { message: "Meeting not found" });
					return;
				}

				if (meeting.endedAt) {
					socket.emit("error", { message: "Meeting has ended" });
					return;
				}

				const message = await createMeetingMessage({
					meetingId: meeting.id,
					senderId: user.userId,
					userId: user.userId,
					content: text,
					role: "USER",
				});

				typingByRoom.get(roomId)?.delete(user.userId);
				emitTyping(io, roomId);

				io.to(meetingRoom(roomId)).emit("new_message", message);
			} catch (error) {
				console.error("send_message error:", error);
				socket.emit("error", { message: "Failed to send message" });
			}
		});

		socket.on("typing_start", ({ roomId }) => {
			if (!roomId?.trim()) return;

			if (!typingByRoom.has(roomId)) {
				typingByRoom.set(roomId, new Map());
			}
			typingByRoom.get(roomId)!.set(user.userId, user.displayName);
			emitTyping(io, roomId, user.userId);
		});

		socket.on("typing_stop", ({ roomId }) => {
			if (!roomId?.trim()) return;

			typingByRoom.get(roomId)?.delete(user.userId);
			emitTyping(io, roomId, user.userId);
		});

		socket.on("transcription_start", async ({ roomId, sampleRate }) => {
			try {
				if (!roomId?.trim()) return;

				const status = getDeepgramConfigStatus();
				if (!status.configured) {
					socket.emit("error", {
						message: "Transcription is not configured (DEEPGRAM_API_KEY)",
					});
					return;
				}

				const meeting = await getMeetingByRoomId(roomId.trim());
				if (!meeting || meeting.endedAt) {
					socket.emit("error", { message: "Meeting not available" });
					return;
				}

				const trimmedRoomId = roomId.trim();

				await startDeepgramSession(
					socket.id,
					{
					meetingId: meeting.id,
					speaker: user.displayName,
					speakerId: user.userId,
					onResult: (chunk) => {
						io.to(meetingRoom(trimmedRoomId)).emit("transcript_chunk", {
							meetingId: meeting.id,
							speaker: chunk.speaker,
							speakerId: chunk.speakerId,
							text: chunk.text,
							isFinal: chunk.isFinal,
							timestamp: chunk.timestamp,
							id: chunk.id,
						});

						if (chunk.isFinal) {
							scheduleNotesRefresh(io, {
								roomId: trimmedRoomId,
								meetingId: meeting.id,
							});
						}
					},
					onClose: () => {
						socket.emit("transcription_stopped", { roomId: trimmedRoomId });
					},
				},
					sampleRate ?? 48_000,
				);

				socket.emit("transcription_started", { roomId: trimmedRoomId });
			} catch (error) {
				console.error("transcription_start error:", error);
				socket.emit("error", { message: "Failed to start transcription" });
			}
		});

		socket.on("transcription_stop", async ({ roomId: _roomId }) => {
			await stopDeepgramSession(socket.id);
		});

		socket.on("transcription_audio", ({ roomId, chunk }) => {
			if (!roomId?.trim() || !chunk || !hasDeepgramSession(socket.id)) return;

			const buffer = Buffer.isBuffer(chunk)
				? chunk
				: Buffer.from(chunk as ArrayBuffer);
			if (buffer.length === 0) return;

			try {
				sendDeepgramAudio(socket.id, buffer);
			} catch (err) {
				console.warn("transcription_audio error:", err);
			}
		});

		socket.on("add_manual_note", async ({ roomId, text }) => {
			try {
				const trimmedRoomId = roomId?.trim();
				const trimmedText = text?.trim();
				if (!trimmedRoomId || !trimmedText) return;

				if (trimmedText.length > 2000) {
					socket.emit("error", { message: "Note is too long" });
					return;
				}

				const meeting = await getMeetingByRoomId(trimmedRoomId);
				if (!meeting || meeting.endedAt) {
					socket.emit("error", { message: "Meeting not available" });
					return;
				}

				const note = await upsertManualNoteForRoomId({
					roomId: trimmedRoomId,
					text: trimmedText,
				});
				if (!note) {
					socket.emit("error", { message: "Failed to save note" });
					return;
				}

				io.to(meetingRoom(trimmedRoomId)).emit("note_updated", { note });
			} catch (error) {
				console.error("add_manual_note error:", error);
				socket.emit("error", { message: "Failed to save note" });
			}
		});

		socket.on("ask_ai", async ({ roomId, content }) => {
			try {
				const trimmedRoomId = roomId?.trim();
				const trimmedContent = content?.trim();
				if (!trimmedRoomId || !trimmedContent) return;

				if (trimmedContent.length > 4000) {
					socket.emit("error", { message: "Message is too long" });
					return;
				}

				const meeting = await getMeetingByRoomId(trimmedRoomId);
				if (!meeting || meeting.endedAt) {
					socket.emit("error", { message: "Meeting not available" });
					return;
				}

				const userMessage: AiAssistantMessage = {
					id: crypto.randomUUID(),
					role: "user",
					content: trimmedContent,
					timestamp: new Date().toISOString(),
				};

				io.to(meetingRoom(trimmedRoomId)).emit("ai_message", {
					message: userMessage,
				});

				io.to(meetingRoom(trimmedRoomId)).emit("ai_typing", {
					roomId: trimmedRoomId,
					typing: true,
				});

				const reply = await answerMeetingAssistantQuestion({
					roomId: trimmedRoomId,
					question: trimmedContent,
				});

				const aiMessage: AiAssistantMessage = {
					id: crypto.randomUUID(),
					role: "ai",
					content: reply,
					timestamp: new Date().toISOString(),
				};

				io.to(meetingRoom(trimmedRoomId)).emit("ai_message", {
					message: aiMessage,
				});
			} catch (error) {
				console.error("ask_ai error:", error);
				const message =
					error instanceof Error ? error.message : "Failed to get AI response";
				socket.emit("error", { message });
			} finally {
				const trimmedRoomId = roomId?.trim();
				if (trimmedRoomId) {
					io.to(meetingRoom(trimmedRoomId)).emit("ai_typing", {
						roomId: trimmedRoomId,
						typing: false,
					});
				}
			}
		});

		socket.on("disconnect", async () => {
			await stopDeepgramSession(socket.id);
			const activeRoomId = socket.data.roomId;
			if (activeRoomId) {
				await leaveRoom(socket, io, activeRoomId, user);
			}
		});
	});
}
