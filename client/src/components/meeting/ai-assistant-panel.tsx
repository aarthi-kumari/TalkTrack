"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

import { useMeetingRoom } from "@/contexts/meeting-room-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AiAssistantMessage } from "@/lib/socket";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function AssistantContent({
	messages,
	input,
	setInput,
	handleSend,
	connected,
	aiEnabled,
	aiTyping,
	compact = false,
}: {
	messages: AiAssistantMessage[];
	input: string;
	setInput: (s: string) => void;
	handleSend: () => void;
	connected: boolean;
	aiEnabled: boolean;
	aiTyping: boolean;
	compact?: boolean;
}) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
	}, [messages.length, aiTyping]);

	const canSend = connected && aiEnabled && !aiTyping && input.trim().length > 0;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
						<Sparkles className="size-4 text-white" />
					</div>
					<div>
						<h2 className="font-semibold">AI Assistant</h2>
						<p className="text-xs text-muted-foreground">
							Ask about this meeting
						</p>
					</div>
				</div>
				<Badge variant={connected && aiEnabled ? "default" : "secondary"}>
					{!aiEnabled ? "Not configured" : connected ? "Ready" : "Connecting…"}
				</Badge>
			</div>

			<div
				className={cn(
					"flex min-h-0 flex-1 flex-col overflow-hidden p-4",
					compact && "gap-2",
				)}
			>
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					<div className="flex flex-col gap-3 pb-2">
						{!aiEnabled ? (
							<p className="text-sm text-muted-foreground">
								Add <code className="text-xs">GROQ_API_KEY</code> to{" "}
								<code className="text-xs">server/.env</code> and restart the
								server to enable the AI assistant.
							</p>
						) : messages.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{connected
									? "Ask a question about the meeting, transcript, or notes."
									: "Connecting to the meeting room…"}
							</p>
						) : (
							messages.map((msg) => (
								<div
									key={msg.id}
									className={cn(
										"max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
										msg.role === "user"
											? "ml-auto bg-primary/10 text-foreground"
											: "border border-border/60 bg-muted/35 text-foreground/85",
									)}
								>
									<p className="whitespace-pre-wrap">{msg.content}</p>
									<p className="mt-2 text-xs text-muted-foreground">
										{formatTime(msg.timestamp)}
									</p>
								</div>
							))
						)}
						{aiTyping ? (
							<div className="max-w-[92%] rounded-2xl border border-border/60 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
								Thinking…
							</div>
						) : null}
						<div ref={bottomRef} />
					</div>
				</div>

				<div className="shrink-0 border-t border-border/60 p-3">
					<InputGroup>
						<InputGroupInput
							placeholder={
								aiEnabled
									? "Ask AI anything…"
									: "AI assistant not configured"
							}
							value={input}
							disabled={!connected || !aiEnabled || aiTyping}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleSend();
								}
							}}
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-sm"
								onClick={handleSend}
								disabled={!canSend}
								aria-label="Send to AI"
							>
								<Send className="size-4" />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</div>
			</div>
		</div>
	);
}

export function AIAssistantPanel({
	embedded = false,
	fill = false,
}: {
	embedded?: boolean;
	fill?: boolean;
}) {
	const [input, setInput] = useState("");
	const isMobile = useIsMobile();
	const { aiMessages, aiTyping, aiEnabled, connected, askAi } = useMeetingRoom();

	function handleSend() {
		const trimmed = input.trim();
		if (!trimmed) return;
		askAi(trimmed);
		setInput("");
	}

	const contentProps = {
		messages: aiMessages,
		input,
		setInput,
		handleSend,
		connected,
		aiEnabled,
		aiTyping,
	};

	if (isMobile && !embedded) {
		return (
			<Sheet>
				<SheetTrigger asChild>
					<button className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
						<Sparkles />
					</button>
				</SheetTrigger>
				<SheetContent side="bottom" className="rounded-t-3xl p-0">
					<AssistantContent {...contentProps} />
				</SheetContent>
			</Sheet>
		);
	}

	if (embedded) {
		return (
			<Card
				className={cn(
					"flex flex-col overflow-hidden border-border/70 bg-card shadow-sm",
					fill
						? "h-full min-h-0 flex-1 rounded-none border-0 shadow-none"
						: "max-h-112",
				)}
			>
				<AssistantContent {...contentProps} compact />
			</Card>
		);
	}

	return (
		<aside className="sticky top-6 flex h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
			<AssistantContent {...contentProps} />
		</aside>
	);
}
