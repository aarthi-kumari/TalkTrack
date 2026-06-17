"use client";

import { Captions, FileText, MessageSquare, Sparkles } from "lucide-react";

import { AIAssistantPanel } from "@/components/meeting/ai-assistant-panel";
import { ChatPanel } from "@/components/meeting/ChatPanel";
import { LiveNotesPanel } from "@/components/meeting/live-notes-panel";
import { TranscriptPanel } from "@/components/meeting/transcript-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MeetingSidePanelProps = {
	roomId: string;
};

export function MeetingSidePanel({ roomId }: MeetingSidePanelProps) {
	return (
		<aside className="meeting-side-panel flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
			<Tabs defaultValue="transcript" className="flex h-full min-h-0 max-h-full flex-col gap-0 overflow-hidden">
				<TabsList className="grid h-auto w-full shrink-0 grid-cols-4 rounded-none border-b border-border/60 bg-muted/40 p-1">
					<TabsTrigger value="transcript" className="gap-1.5 text-xs sm:text-sm">
						<Captions className="size-3.5 shrink-0" />
						<span className="truncate">Transcript</span>
					</TabsTrigger>
					<TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm">
						<FileText className="size-3.5 shrink-0" />
						<span className="truncate">Notes</span>
					</TabsTrigger>
					<TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
						<MessageSquare className="size-3.5 shrink-0" />
						<span className="truncate">Chat</span>
					</TabsTrigger>
					<TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm">
						<Sparkles className="size-3.5 shrink-0" />
						<span className="truncate">AI</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent
					value="transcript"
					className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<TranscriptPanel fill />
				</TabsContent>
				<TabsContent
					value="notes"
					className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<LiveNotesPanel fill />
				</TabsContent>
				<TabsContent
					value="chat"
					className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<ChatPanel roomId={roomId} fill />
				</TabsContent>
				<TabsContent
					value="ai"
					className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
				>
					<AIAssistantPanel embedded fill />
				</TabsContent>
			</Tabs>
		</aside>
	);
}
