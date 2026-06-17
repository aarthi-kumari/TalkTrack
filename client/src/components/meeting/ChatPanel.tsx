"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";

import { useMeetingChat } from "@/hooks/use-meeting-chat";
import type { ChatMessage, MessageRole } from "@/lib/api";
import { useUserStore } from "@/stores/user-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
	roomId: string;
	fill?: boolean;
};

const roleStyles: Record<MessageRole, string> = {
	USER: "bg-muted/60 text-foreground",
	AI: "border border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
	SYSTEM: "border border-dashed border-border bg-transparent text-muted-foreground italic",
};

export function ChatPanel({ roomId, fill = false }: ChatPanelProps) {
	const { dbUser } = useUserStore();
	const {
		messages,
		participants,
		typingUsers,
		connected,
		sendMessage,
		notifyTypingStart,
		notifyTypingStop,
	} = useMeetingChat(roomId);

	const [draft, setDraft] = useState("");
	const bottomRef = useRef<HTMLDivElement>(null);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	function handleSend() {
		const text = draft.trim();
		if (!text) return;
		sendMessage(text);
		setDraft("");
		notifyTypingStop();
	}

	function handleDraftChange(value: string) {
		setDraft(value);
		notifyTypingStart();
		if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
		typingTimeoutRef.current = setTimeout(() => notifyTypingStop(), 1500);
	}

	return (
		<Card
			className={cn(
				"flex flex-col border-border/70 bg-card shadow-sm",
				fill
					? "h-full min-h-0 flex-1 rounded-none border-0 shadow-none"
					: "h-[min(18rem,32vh)] min-h-[14rem]",
			)}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 px-4 py-3">
				<div className="flex items-center gap-2">
					<MessageSquare className="size-4 text-primary" />
					<CardTitle className="text-base">Chat</CardTitle>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={connected ? "default" : "secondary"}>
						{connected ? "Live" : "Connecting…"}
					</Badge>
					<Badge variant="outline">{participants.length} online</Badge>
				</div>
			</CardHeader>

			<CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-0">
				<ScrollArea className="min-h-0 flex-1 px-4 py-3">
					<div className="flex flex-col gap-3">
						{messages.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No messages yet. Say hello to the room.
							</p>
						) : (
							messages.map((message) => (
								<ChatBubble
									key={message.id}
									message={message}
									isSelf={message.senderId === dbUser?.id}
								/>
							))
						)}
						<div ref={bottomRef} />
					</div>
				</ScrollArea>

				{typingUsers.length > 0 ? (
					<p className="px-4 text-xs text-muted-foreground">
						{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
						typing…
					</p>
				) : null}

				<div className="flex gap-2 border-t border-border/60 p-3">
					<Textarea
						value={draft}
						onChange={(e) => handleDraftChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder="Message everyone…"
						className="min-h-[44px] resize-none"
						rows={1}
					/>
					<Button
						type="button"
						size="icon"
						onClick={handleSend}
						disabled={!draft.trim() || !connected}
						aria-label="Send message"
					>
						<Send className="size-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function ChatBubble({
	message,
	isSelf,
}: {
	message: ChatMessage;
	isSelf: boolean;
}) {
	const label =
		message.role === "AI"
			? "AI Assistant"
			: message.role === "SYSTEM"
				? "System"
				: (message.sender.name ?? message.sender.email);

	return (
		<div className={cn("flex flex-col gap-1", isSelf && "items-end")}>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<span className="font-medium text-foreground/80">{label}</span>
				<span>{formatTime(message.createdAt)}</span>
			</div>
			<div
				className={cn(
					"max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
					roleStyles[message.role],
					isSelf && message.role === "USER" && "bg-primary/10 text-foreground",
				)}
			>
				{message.content}
			</div>
		</div>
	);
}

function formatTime(iso: string) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
