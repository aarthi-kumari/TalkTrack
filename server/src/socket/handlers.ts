import type { Server, Socket } from "socket.io";

import {
	createMeetingMessage,
	getMeetingByRoomId,
	getMeetingMessageHistory,
	markParticipantLeft,
	upsertMeetingParticipant,
} from "../services/meeting-chat";
import { authenticateSocket } from "./auth";
import type {
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

		socket.on("disconnect", async () => {
			const roomId = socket.data.roomId;
			if (roomId) {
				await leaveRoom(socket, io, roomId, user);
			}
		});
	});
}
