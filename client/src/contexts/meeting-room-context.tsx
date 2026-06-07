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
import type { ChatMessage } from "@/lib/api";
import {
	connectMeetingSocket,
	getMeetingSocket,
	releaseMeetingSocket,
} from "@/lib/socket";

export type MeetingParticipant = {
	userId: string;
	displayName: string;
};

type MeetingRoomContextValue = {
	messages: ChatMessage[];
	participants: MeetingParticipant[];
	typingUsers: string[];
	connected: boolean;
	sendMessage: (content: string) => void;
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
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
	const [typingUsers, setTypingUsers] = useState<string[]>([]);
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

	useEffect(() => {
		if (!roomId?.trim()) return;

		let cancelled = false;
		joinedRef.current = false;

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

				const onError = ({ message }: { message: string }) => {
					toast.error(message);
				};

				socket.on("connect", onConnect);
				socket.on("disconnect", onDisconnect);
				socket.on("message_history", onHistory);
				socket.on("new_message", onNewMessage);
				socket.on("presence_updated", onPresence);
				socket.on("typing_update", onTyping);
				socket.on("error", onError);

				if (socket.connected) onConnect();

				return () => {
					socket.off("connect", onConnect);
					socket.off("disconnect", onDisconnect);
					socket.off("message_history", onHistory);
					socket.off("new_message", onNewMessage);
					socket.off("presence_updated", onPresence);
					socket.off("typing_update", onTyping);
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
		};
	}, [roomId, getToken]);

	const value = useMemo(
		() => ({
			messages,
			participants,
			typingUsers,
			connected,
			sendMessage,
			notifyTypingStart,
			notifyTypingStop,
		}),
		[
			messages,
			participants,
			typingUsers,
			connected,
			sendMessage,
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
			connected: false,
			sendMessage: () => undefined,
			notifyTypingStart: () => undefined,
			notifyTypingStop: () => undefined,
		};
	}
	return context;
}
