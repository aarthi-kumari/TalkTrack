"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { toast } from "sonner";

import { useApiToken } from "@/hooks/use-api-token";
import type { ChatMessage, TranscriptChunk } from "@/lib/api";
import { getAiStatus, getTranscriptionStatus } from "@/lib/api";
import {
	connectMeetingSocket,
	getMeetingSocket,
	releaseMeetingSocket,
} from "@/lib/socket";
import type { AiAssistantMessage, MeetingNoteDto } from "@/lib/socket";
import { useUserStore } from "@/stores/user-store";

export type MeetingParticipant = {
	userId: string;
	displayName: string;
};

type MeetingRoomContextValue = {
	messages: ChatMessage[];
	participants: MeetingParticipant[];
	typingUsers: string[];
	transcripts: TranscriptChunk[];
	interimTranscripts: Record<string, TranscriptChunk>;
	transcriptionEnabled: boolean;
	note: MeetingNoteDto | null;
	aiMessages: AiAssistantMessage[];
	aiTyping: boolean;
	aiEnabled: boolean;
	connected: boolean;
	sendMessage: (content: string) => void;
	addManualNote: (text: string) => void;
	askAi: (content: string) => void;
	notifyTypingStart: () => void;
	notifyTypingStop: () => void;
};

const MeetingRoomContext = createContext<MeetingRoomContextValue | null>(null);

export function MeetingRoomProvider({
	roomId,
	children,
}: {
	roomId: string;
	children: ReactNode;
}) {
	const getToken = useApiToken();
	const dbUser = useUserStore((state) => state.dbUser);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
	const [typingUsers, setTypingUsers] = useState<string[]>([]);
	const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([]);
	const [interimTranscripts, setInterimTranscripts] = useState<
		Record<string, TranscriptChunk>
	>({});
	const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
	const [note, setNote] = useState<MeetingNoteDto | null>(null);
	const [aiMessages, setAiMessages] = useState<AiAssistantMessage[]>([]);
	const [aiTyping, setAiTyping] = useState(false);
	const [aiEnabled, setAiEnabled] = useState(false);
	const [connected, setConnected] = useState(false);
	const joinedRef = useRef(false);
	const roomIdRef = useRef(roomId);

	roomIdRef.current = roomId;

	const sendMessage = useCallback((content: string) => {
		const activeRoomId = roomIdRef.current;
		if (!activeRoomId?.trim()) return;

		const socket = getMeetingSocket();
		if (!socket?.connected) {
			toast.error("Chat is not connected");
			return;
		}
		socket.emit("send_message", { roomId: activeRoomId, content });
	}, []);

	const notifyTypingStart = useCallback(() => {
		const activeRoomId = roomIdRef.current;
		if (!activeRoomId?.trim()) return;
		getMeetingSocket()?.emit("typing_start", { roomId: activeRoomId });
	}, []);

	const notifyTypingStop = useCallback(() => {
		const activeRoomId = roomIdRef.current;
		if (!activeRoomId?.trim()) return;
		getMeetingSocket()?.emit("typing_stop", { roomId: activeRoomId });
	}, []);

	const addManualNote = useCallback((text: string) => {
		const activeRoomId = roomIdRef.current;
		if (!activeRoomId?.trim()) return;

		const trimmed = text.trim();
		if (!trimmed) return;

		const socket = getMeetingSocket();
		if (!socket?.connected) {
			toast.error("Notes are not connected");
			return;
		}
		socket.emit("add_manual_note", { roomId: activeRoomId, text: trimmed });
	}, []);

	const askAi = useCallback((content: string) => {
		const activeRoomId = roomIdRef.current;
		if (!activeRoomId?.trim()) return;

		const trimmed = content.trim();
		if (!trimmed) return;

		const socket = getMeetingSocket();
		if (!socket?.connected) {
			toast.error("AI assistant is not connected");
			return;
		}
		if (!aiEnabled) {
			toast.error("AI assistant is not configured on the server");
			return;
		}
		socket.emit("ask_ai", { roomId: activeRoomId, content: trimmed });
	}, [aiEnabled]);

	useEffect(() => {
		if (!roomId?.trim() || !dbUser) return;

		let cancelled = false;
		joinedRef.current = false;

		void getTranscriptionStatus()
			.then((status) => {
				if (!cancelled) {
					setTranscriptionEnabled(status.configured);
				}
			})
			.catch(() => {
				// Socket join will still emit transcription_ready.
			});

		void getAiStatus()
			.then((status) => {
				if (!cancelled) {
					setAiEnabled(status.configured);
				}
			})
			.catch(() => {
				// AI panel will show configuration hint.
			});

		async function connect() {
			try {
				const token = await getToken();
				if (cancelled) return;

				const socket = connectMeetingSocket(token);

				const onConnect = () => {
					setConnected(true);
					if (!joinedRef.current) {
						socket.emit("join_meeting", { roomId });
						joinedRef.current = true;
					}
				};

				const onDisconnect = () => setConnected(false);

				const onHistory = ({ messages: history }: { messages: ChatMessage[] }) => {
					setMessages(history);
				};

				const onNewMessage = (message: ChatMessage) => {
					setMessages((prev) =>
						prev.some((m) => m.id === message.id) ? prev : [...prev, message],
					);
				};

				const onPresence = ({
					participants: list,
				}: {
					participants: { userId: string; displayName: string }[];
				}) => {
					setParticipants(
						list.map(({ userId, displayName }) => ({ userId, displayName })),
					);
				};

				const onTyping = ({
					typingUsers: users,
				}: {
					roomId: string;
					typingUsers: string[];
				}) => {
					setTypingUsers(users);
				};

				const onTranscriptionReady = ({ enabled }: { enabled: boolean }) => {
					setTranscriptionEnabled(enabled);
				};

				const onTranscriptHistory = ({
					transcripts: history,
				}: {
					transcripts: TranscriptChunk[];
				}) => {
					setTranscripts(history);
				};

				const onTranscriptChunk = (chunk: TranscriptChunk) => {
					if (chunk.isFinal) {
						setTranscripts((prev) => {
							if (chunk.id && prev.some((row) => row.id === chunk.id)) {
								return prev;
							}
							return [...prev, chunk];
						});
						setInterimTranscripts((prev) => {
							if (!chunk.speakerId) return prev;
							const next = { ...prev };
							delete next[chunk.speakerId];
							return next;
						});
						return;
					}

					if (!chunk.speakerId) return;
					setInterimTranscripts((prev) => ({
						...prev,
						[chunk.speakerId]: chunk,
					}));
				};

				const onNoteCurrent = ({ note: current }: { note: MeetingNoteDto | null }) => {
					setNote(current);
				};

				const onNoteUpdated = ({ note: updated }: { note: MeetingNoteDto }) => {
					setNote(updated);
				};

				const onAiMessage = ({ message }: { message: AiAssistantMessage }) => {
					setAiMessages((prev) =>
						prev.some((row) => row.id === message.id) ? prev : [...prev, message],
					);
				};

				const onAiTyping = ({
					roomId: typingRoomId,
					typing,
				}: {
					roomId: string;
					typing: boolean;
				}) => {
					if (typingRoomId === roomId) {
						setAiTyping(typing);
					}
				};

				const onError = ({ message }: { message: string }) => {
					toast.error(message);
				};

				const onConnectError = (err: Error) => {
					setConnected(false);
					if (cancelled) return;

					const message = err.message || "Failed to connect to meeting room";
					if (message.toLowerCase().includes("not synced")) {
						return;
					}
					toast.error(message);
				};

				socket.on("connect", onConnect);
				socket.on("disconnect", onDisconnect);
				socket.on("connect_error", onConnectError);
				socket.on("message_history", onHistory);
				socket.on("new_message", onNewMessage);
				socket.on("presence_updated", onPresence);
				socket.on("typing_update", onTyping);
				socket.on("transcription_ready", onTranscriptionReady);
				socket.on("transcript_history", onTranscriptHistory);
				socket.on("transcript_chunk", onTranscriptChunk);
				socket.on("note_current", onNoteCurrent);
				socket.on("note_updated", onNoteUpdated);
				socket.on("ai_message", onAiMessage);
				socket.on("ai_typing", onAiTyping);
				socket.on("error", onError);

				if (socket.connected) onConnect();

				return () => {
					socket.off("connect", onConnect);
					socket.off("disconnect", onDisconnect);
					socket.off("connect_error", onConnectError);
					socket.off("message_history", onHistory);
					socket.off("new_message", onNewMessage);
					socket.off("presence_updated", onPresence);
					socket.off("typing_update", onTyping);
					socket.off("transcription_ready", onTranscriptionReady);
					socket.off("transcript_history", onTranscriptHistory);
					socket.off("transcript_chunk", onTranscriptChunk);
					socket.off("note_current", onNoteCurrent);
					socket.off("note_updated", onNoteUpdated);
					socket.off("ai_message", onAiMessage);
					socket.off("ai_typing", onAiTyping);
					socket.off("error", onError);
					socket.emit("leave_meeting", { roomId });
					joinedRef.current = false;
				};
			} catch (err) {
				if (!cancelled) {
					const message =
						err instanceof Error ? err.message : "Failed to connect chat";
					toast.error(message);
				}
			}
		}

		let cleanupSocket: (() => void) | undefined;

		connect().then((cleanup) => {
			cleanupSocket = cleanup;
		});

		return () => {
			cancelled = true;
			cleanupSocket?.();
			releaseMeetingSocket();
			setConnected(false);
			setMessages([]);
			setParticipants([]);
			setTypingUsers([]);
			setTranscripts([]);
			setInterimTranscripts({});
			setTranscriptionEnabled(false);
			setNote(null);
			setAiMessages([]);
			setAiTyping(false);
			setAiEnabled(false);
		};
	}, [roomId, getToken, dbUser]);

	const value = useMemo(
		() => ({
			messages,
			participants,
			typingUsers,
			transcripts,
			interimTranscripts,
			transcriptionEnabled,
			note,
			aiMessages,
			aiTyping,
			aiEnabled,
			connected,
			sendMessage,
			addManualNote,
			askAi,
			notifyTypingStart,
			notifyTypingStop,
		}),
		[
			messages,
			participants,
			typingUsers,
			transcripts,
			interimTranscripts,
			transcriptionEnabled,
			note,
			aiMessages,
			aiTyping,
			aiEnabled,
			connected,
			sendMessage,
			addManualNote,
			askAi,
			notifyTypingStart,
			notifyTypingStop,
		],
	);

	return (
		<MeetingRoomContext.Provider value={value}>
			{children}
		</MeetingRoomContext.Provider>
	);
}

export function useMeetingRoom() {
	const context = useContext(MeetingRoomContext);
	if (!context) {
		throw new Error("useMeetingRoom must be used within MeetingRoomProvider");
	}
	return context;
}

/** @deprecated Use useMeetingRoom inside MeetingRoomProvider */
export function useMeetingChat(roomId: string | null) {
	const context = useContext(MeetingRoomContext);
	if (!context) {
		throw new Error(
			"useMeetingChat requires MeetingRoomProvider. Wrap the meeting page with it.",
		);
	}
	if (!roomId?.trim()) {
		return {
			messages: [],
			participants: [],
			typingUsers: [],
			transcripts: [],
			interimTranscripts: {},
			transcriptionEnabled: false,
			connected: false,
			sendMessage: () => undefined,
			notifyTypingStart: () => undefined,
			notifyTypingStop: () => undefined,
		};
	}
	return context;
}
