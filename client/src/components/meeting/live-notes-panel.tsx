"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { mockLiveNotes } from "@/lib/mock/notes";

export function LiveNotesPanel() {
	const [notes, setNotes] = useState(mockLiveNotes);
	const [draft, setDraft] = useState("");

	function addNote() {
		const trimmed = draft.trim();
		if (!trimmed) return;
		setNotes((prev) => [...prev, trimmed]);
		setDraft("");
	}

	return (
		<Card className="flex min-h-0 flex-1 flex-col rounded-3xl border-border/70 bg-card/95 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
			<CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/60 pb-4">
				<div>
					<CardTitle>Live Notes</CardTitle>
					<p className="text-sm text-muted-foreground">Capture decisions as the meeting unfolds.</p>
				</div>
				<Badge variant="secondary" className="rounded-full px-2.5">
					Auto-saving
				</Badge>
			</CardHeader>
			<CardContent className="min-h-0 flex-1 p-0">
				<ScrollArea className="h-full max-h-[320px] px-4 py-4 lg:max-h-[360px]">
					<ul className="flex flex-col gap-3">
						{notes.map((note, i) => (
							<li
								key={`${i}-${note.slice(0, 12)}`}
								className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-sm leading-relaxed text-foreground/80"
							>
								{note}
							</li>
						))}
					</ul>
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
