"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Captions, ChevronDown, ChevronUp } from "lucide-react";

import { useMeetingRoom } from "@/contexts/meeting-room-context";
import type { TranscriptChunk } from "@/lib/api";
import { useUserStore } from "@/stores/user-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function TranscriptPanel({ fill = false }: { fill?: boolean }) {
	const { transcripts, interimTranscripts, transcriptionEnabled, connected } =
		useMeetingRoom();
	const dbUser = useUserStore((state) => state.dbUser);
	const syncError = useUserStore((state) => state.syncError);
	const [collapsed, setCollapsed] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const statusLabel = !transcriptionEnabled
		? "Off"
		: !dbUser
			? "Syncing…"
			: !connected
				? "Connecting…"
				: "Listening";

	const lines = useMemo(
		() => buildTranscriptLines(transcripts, interimTranscripts),
		[transcripts, interimTranscripts],
	);

	useEffect(() => {
		if (collapsed || !scrollRef.current) return;
		scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [lines.length, lines.at(-1)?.text, collapsed]);

	return (
		<Card
			className={cn(
				"flex flex-col border-border/70 bg-card shadow-sm",
				fill ? "h-full min-h-0 flex-1 rounded-none border-0 shadow-none" : "shrink-0",
			)}
		>
			<CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b border-border/60 px-4 py-3">
				<div className="flex items-center gap-2">
					<Captions className="size-4 text-primary" />
					<CardTitle className="text-base">Live transcript</CardTitle>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={transcriptionEnabled && connected ? "default" : "secondary"}>
						{statusLabel}
					</Badge>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={() => setCollapsed((value) => !value)}
						aria-label={collapsed ? "Expand transcript" : "Collapse transcript"}
					>
						{collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
					</Button>
				</div>
			</CardHeader>

			{!collapsed ? (
				<CardContent
					className={cn(
						"p-0",
						fill && "flex min-h-0 flex-1 flex-col overflow-hidden",
					)}
				>
					{fill ? (
						<div
							ref={scrollRef}
							className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
						>
							<TranscriptBody
								transcriptionEnabled={transcriptionEnabled}
								dbUser={dbUser}
								syncError={syncError}
								connected={connected}
								lines={lines}
							/>
						</div>
					) : (
						<ScrollArea className="h-56 px-4 py-3">
							<TranscriptBody
								transcriptionEnabled={transcriptionEnabled}
								dbUser={dbUser}
								syncError={syncError}
								connected={connected}
								lines={lines}
							/>
						</ScrollArea>
					)}
				</CardContent>
			) : null}
		</Card>
	);
}

type TranscriptLine = ReturnType<typeof buildTranscriptLines>[number];

function TranscriptBody({
	transcriptionEnabled,
	dbUser,
	syncError,
	connected,
	lines,
}: {
	transcriptionEnabled: boolean;
	dbUser: { id: string } | null;
	syncError: string | null;
	connected: boolean;
	lines: TranscriptLine[];
}) {
	if (!transcriptionEnabled) {
		return (
			<div className="space-y-2 text-sm text-muted-foreground">
				<p>
					Live captions are disabled because{" "}
					<code className="text-xs">DEEPGRAM_API_KEY</code> is not set in{" "}
					<code className="text-xs">server/.env</code>.
				</p>
				<ol className="list-decimal space-y-1 pl-4">
					<li>
						Get a free key from{" "}
						<a
							href="https://console.deepgram.com/signup"
							target="_blank"
							rel="noreferrer"
							className="text-primary underline-offset-4 hover:underline"
						>
							console.deepgram.com
						</a>
					</li>
					<li>
						Add{" "}
						<code className="text-xs">DEEPGRAM_API_KEY=&quot;your-key&quot;</code> to{" "}
						<code className="text-xs">server/.env</code>
					</li>
					<li>
						Restart the dev server (<code className="text-xs">npm run dev</code>)
					</li>
				</ol>
			</div>
		);
	}

	if (!dbUser) {
		return (
			<p className="text-sm text-muted-foreground">
				{syncError
					? `Account sync failed: ${syncError}`
					: "Connecting your account before live captions can start…"}
			</p>
		);
	}

	if (!connected) {
		return (
			<p className="text-sm text-muted-foreground">
				Connecting to the meeting room…
			</p>
		);
	}

	if (lines.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				Speak with your microphone on — captions will appear here.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{lines.map((line) => (
				<div key={line.key} className="flex flex-col gap-0.5">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span className="font-medium text-foreground/80">{line.speaker}</span>
						<span>{formatTime(line.timestamp)}</span>
					</div>
					<p
						className={cn(
							"text-sm leading-relaxed",
							!line.isFinal && "italic text-muted-foreground",
						)}
					>
						{line.text}
					</p>
				</div>
			))}
		</div>
	);
}

function buildTranscriptLines(
	finals: TranscriptChunk[],
	interims: Record<string, TranscriptChunk>,
) {
	const interimLines = Object.values(interims).map((chunk) => ({
		key: `interim-${chunk.speakerId}`,
		speaker: chunk.speaker,
		text: chunk.text,
		isFinal: false,
		timestamp: chunk.timestamp,
	}));

	const finalLines = finals.map((chunk) => ({
		key: chunk.id ?? `${chunk.speakerId}-${chunk.timestamp}`,
		speaker: chunk.speaker,
		text: chunk.text,
		isFinal: true,
		timestamp: chunk.timestamp,
	}));

	return [...finalLines, ...interimLines];
}

function formatTime(iso: string) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
