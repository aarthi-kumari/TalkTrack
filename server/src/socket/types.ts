import type { ChatMessageDto } from "../services/meeting-chat";
import type { MeetingNoteDto } from "../services/notes.service";
import type { TranscriptChunkDto } from "../services/meeting-transcript";

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
export type TranscriptionRoomPayload = { roomId: string; sampleRate?: number };
export type TranscriptionAudioPayload = {
	roomId: string;
	chunk: ArrayBuffer | Buffer;
};

export type AddManualNotePayload = {
	roomId: string;
	text: string;
};

export type AskAiPayload = {
	roomId: string;
	content: string;
};

export type AiAssistantMessage = {
	id: string;
	role: "user" | "ai";
	content: string;
	timestamp: string;
};

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
	transcript_history: (payload: { transcripts: TranscriptChunkDto[] }) => void;
	transcript_chunk: (chunk: TranscriptChunkDto) => void;
	transcription_ready: (payload: { enabled: boolean }) => void;
	transcription_started: (payload: { roomId: string }) => void;
	transcription_stopped: (payload: { roomId: string }) => void;
	note_current: (payload: { note: MeetingNoteDto | null }) => void;
	note_updated: (payload: { note: MeetingNoteDto }) => void;
	ai_message: (payload: { message: AiAssistantMessage }) => void;
	ai_typing: (payload: { roomId: string; typing: boolean }) => void;
	error: (payload: { message: string }) => void;
}

/** Events clients emit to the server */
export interface ClientToServerEvents {
	join_meeting: (payload: JoinMeetingPayload) => void;
	leave_meeting: (payload: LeaveMeetingPayload) => void;
	send_message: (payload: SendMessagePayload) => void;
	typing_start: (payload: TypingPayload) => void;
	typing_stop: (payload: TypingPayload) => void;
	transcription_start: (payload: TranscriptionRoomPayload) => void;
	transcription_stop: (payload: TranscriptionRoomPayload) => void;
	transcription_audio: (payload: TranscriptionAudioPayload) => void;
	add_manual_note: (payload: AddManualNotePayload) => void;
	ask_ai: (payload: AskAiPayload) => void;
}
