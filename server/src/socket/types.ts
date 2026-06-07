import type { ChatMessageDto } from "../services/meeting-chat";

export type SocketUserData = {
	userId: string;
	clerkUserId: string;
	displayName: string;
	roomId?: string;
};

export type JoinMeetingPayload = { roomId: string };
export type LeaveMeetingPayload = { roomId: string };
export type SendMessagePayload = { roomId: string; content: string };
export type TypingPayload = { roomId: string };

export type PresenceUser = {
	userId: string;
	displayName: string;
	socketId: string;
};

/** Events the server emits to clients */
export interface ServerToClientEvents {
	message_history: (payload: { messages: ChatMessageDto[] }) => void;
	new_message: (message: ChatMessageDto) => void;
	presence_updated: (payload: { participants: PresenceUser[] }) => void;
	typing_update: (payload: { roomId: string; typingUsers: string[] }) => void;
	error: (payload: { message: string }) => void;
}

/** Events clients emit to the server */
export interface ClientToServerEvents {
	join_meeting: (payload: JoinMeetingPayload) => void;
	leave_meeting: (payload: LeaveMeetingPayload) => void;
	send_message: (payload: SendMessagePayload) => void;
	typing_start: (payload: TypingPayload) => void;
	typing_stop: (payload: TypingPayload) => void;
}
