import { io, type Socket } from "socket.io-client";

import type { ChatMessage, MeetingNoteDto, TranscriptChunk } from "./api";
import { getSocketUrl } from "./env";

export type { MeetingNoteContent, MeetingNoteDto } from "./api";

export type AiAssistantMessage = {
	id: string;
	role: "user" | "ai";
	content: string;
	timestamp: string;
};

export type ClientSocketEvents = {
	join_meeting: (payload: { roomId: string }) => void;
	leave_meeting: (payload: { roomId: string }) => void;
	send_message: (payload: { roomId: string; content: string }) => void;
	typing_start: (payload: { roomId: string }) => void;
	typing_stop: (payload: { roomId: string }) => void;
	transcription_start: (payload: { roomId: string; sampleRate?: number }) => void;
	transcription_stop: (payload: { roomId: string }) => void;
	transcription_audio: (payload: { roomId: string; chunk: ArrayBuffer }) => void;
	add_manual_note: (payload: { roomId: string; text: string }) => void;
	ask_ai: (payload: { roomId: string; content: string }) => void;
};

export type ServerSocketEvents = {
	message_history: (payload: { messages: import("./api").ChatMessage[] }) => void;
	new_message: (payload: import("./api").ChatMessage) => void;
	presence_updated: (payload: {
		participants: { userId: string; displayName: string; socketId: string }[];
	}) => void;
	typing_update: (payload: { roomId: string; typingUsers: string[] }) => void;
	transcript_history: (payload: { transcripts: TranscriptChunk[] }) => void;
	transcript_chunk: (chunk: TranscriptChunk) => void;
	transcription_ready: (payload: { enabled: boolean }) => void;
	transcription_started: (payload: { roomId: string }) => void;
	transcription_stopped: (payload: { roomId: string }) => void;
	note_current: (payload: { note: MeetingNoteDto | null }) => void;
	note_updated: (payload: { note: MeetingNoteDto }) => void;
	ai_history: (payload: { messages: AiAssistantMessage[] }) => void;
	ai_message: (payload: { message: AiAssistantMessage }) => void;
	ai_token: (payload: {
		roomId: string;
		messageId: string;
		token: string;
		done: boolean;
	}) => void;
	ai_tool_called: (payload: {
		roomId: string;
		messageId: string;
		name: string;
		args: Record<string, unknown>;
		result: string;
	}) => void;
	ai_typing: (payload: { roomId: string; typing: boolean }) => void;
	error: (payload: { message: string }) => void;
};

export type MeetingSocket = Socket<ServerSocketEvents, ClientSocketEvents>;

let socket: MeetingSocket | null = null;
let activeAuthToken: string | null = null;

export function getMeetingSocket(): MeetingSocket | null {
	return socket;
}

export function connectMeetingSocket(token: string): MeetingSocket {
	if (socket?.connected && activeAuthToken === token) {
		return socket;
	}

	if (socket && activeAuthToken === token && !socket.connected) {
		socket.connect();
		return socket;
	}

	if (socket) {
		socket.removeAllListeners();
		socket.disconnect();
		socket = null;
		activeAuthToken = null;
	}

	activeAuthToken = token;
	socket = io(getSocketUrl(), {
		auth: { token },
		autoConnect: true,
		transports: ["websocket", "polling"],
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 1000,
	}) as MeetingSocket;

	return socket;
}

export function releaseMeetingSocket() {
	disconnectMeetingSocket();
}

export function disconnectMeetingSocket() {
	if (socket) {
		socket.removeAllListeners();
		socket.disconnect();
		socket = null;
	}
	activeAuthToken = null;
}
