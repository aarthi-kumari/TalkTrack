"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMeetingRoom } from "@/contexts/meeting-room-context";

export function LiveNotesPanel({ fill = false }: { fill?: boolean }) {
	const [draft, setDraft] = useState("");
	const { note, addManualNote, connected } = useMeetingRoom();

	const manualNotes = useMemo(() => note?.content.manualNotes ?? [], [note]);

	function addNote() {
		const trimmed = draft.trim();
		if (!trimmed) return;
		addManualNote(trimmed);
		setDraft("");
	}

	return (
		<Card
			className={cn(
				"flex flex-col border-border/70 bg-card shadow-sm",
				fill ? "h-full min-h-0 flex-1 rounded-none border-0 shadow-none" : "",
			)}
		>
			<CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/60 pb-4">
				<div>
					<CardTitle>Live Notes</CardTitle>
					<p className="text-sm text-muted-foreground">Capture decisions as the meeting unfolds.</p>
				</div>
				<Badge variant="secondary" className="rounded-full px-2.5">
					Auto-saving
				</Badge>
			</CardHeader>
			<CardContent className="flex min-h-0 flex-1 flex-col p-0">
				<ScrollArea className={cn("px-4 py-4", fill ? "min-h-0 flex-1" : "h-40")}>
					{manualNotes.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{connected
								? "No notes yet. Add a note below to share it with everyone in the meeting."
								: "Connecting to the meeting room…"}
						</p>
					) : (
						<ul className="flex flex-col gap-3">
							{manualNotes.map((text, i) => (
								<li
									key={`${i}-${text.slice(0, 24)}`}
									className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-sm leading-relaxed text-foreground/80"
								>
									{text}
								</li>
							))}
						</ul>
					)}
				</ScrollArea>
			</CardContent>
			<CardFooter className="border-t border-border/60 p-4">
				<div className="flex w-full items-end gap-2">
					<Textarea
						placeholder="Add a note…"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={2}
						className="min-h-[48px] resize-none rounded-2xl bg-background/80"
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								addNote();
							}
						}}
					/>
					<Button size="icon-sm" onClick={addNote} aria-label="Add note">
						<Send />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
