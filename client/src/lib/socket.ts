import { io, type Socket } from "socket.io-client";

import { getSocketUrl } from "./env";

export type ClientSocketEvents = {
	join_meeting: (payload: { roomId: string }) => void;
	leave_meeting: (payload: { roomId: string }) => void;
	send_message: (payload: { roomId: string; content: string }) => void;
	typing_start: (payload: { roomId: string }) => void;
	typing_stop: (payload: { roomId: string }) => void;
};

export type ServerSocketEvents = {
	message_history: (payload: { messages: import("./api").ChatMessage[] }) => void;
	new_message: (payload: import("./api").ChatMessage) => void;
	presence_updated: (payload: {
		participants: { userId: string; displayName: string; socketId: string }[];
	}) => void;
	typing_update: (payload: { roomId: string; typingUsers: string[] }) => void;
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
