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

export type ServerToClientEvents = {
	message_history: { messages: ChatMessageDto[] };
	new_message: ChatMessageDto;
	presence_updated: { participants: PresenceUser[] };
	typing_update: { roomId: string; typingUsers: string[] };
	error: { message: string };
};

export type ClientToServerEvents = {
	join_meeting: JoinMeetingPayload;
	leave_meeting: LeaveMeetingPayload;
	send_message: SendMessagePayload;
	typing_start: TypingPayload;
	typing_stop: TypingPayload;
};
