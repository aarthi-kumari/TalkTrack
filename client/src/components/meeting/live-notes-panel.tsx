"use client";

import { useMemo, useState } from "react";
import { CheckSquare, ListTodo, Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMeetingRoom } from "@/contexts/meeting-room-context";

export function LiveNotesPanel({ fill = false }: { fill?: boolean }) {
	const [draft, setDraft] = useState("");
	const { note, addManualNote, connected, passiveAiEnabled } = useMeetingRoom();

	const content = note?.content;
	const manualNotes = useMemo(() => content?.manualNotes ?? [], [content]);
	const hasAiNotes = Boolean(
		content?.summary ||
			content?.keyPoints.length ||
			content?.decisions.length ||
			content?.actionItems.length,
	);

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
					<p className="text-sm text-muted-foreground">
						AI captures decisions as the meeting unfolds.
					</p>
				</div>
				<Badge variant="secondary" className="rounded-full px-2.5">
					{passiveAiEnabled ? "AI listening" : "Manual"}
				</Badge>
			</CardHeader>
			<CardContent className="flex min-h-0 flex-1 flex-col p-0">
				<ScrollArea className={cn("px-4 py-4", fill ? "min-h-0 flex-1" : "h-40")}>
					{!connected ? (
						<p className="text-sm text-muted-foreground">
							Connecting to the meeting room…
						</p>
					) : !hasAiNotes && manualNotes.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{passiveAiEnabled
								? "Notes will appear after a bit of conversation. You can also add a note below."
								: "Add GOOGLE_AI_API_KEY and GROQ_API_KEY to enable automatic notes, or type a note below."}
						</p>
					) : (
						<div className="flex flex-col gap-5">
							{content?.summary ? (
								<section className="flex flex-col gap-2">
									<h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										<Sparkles className="size-3.5" />
										Summary
									</h3>
									<p className="text-sm leading-relaxed text-foreground/85">
										{content.summary}
									</p>
								</section>
							) : null}

							{content?.keyPoints.length ? (
								<section className="flex flex-col gap-2">
									<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Key points
									</h3>
									<ul className="flex flex-col gap-1.5">
										{content.keyPoints.map((item) => (
											<li
												key={item}
												className="text-sm leading-relaxed text-foreground/80"
											>
												• {item}
											</li>
										))}
									</ul>
								</section>
							) : null}

							{content?.decisions.length ? (
								<section className="flex flex-col gap-2">
									<h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										<CheckSquare className="size-3.5" />
										Decisions
									</h3>
									<ul className="flex flex-col gap-1.5">
										{content.decisions.map((item) => (
											<li
												key={item}
												className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-sm leading-relaxed"
											>
												{item}
											</li>
										))}
									</ul>
								</section>
							) : null}

							{content?.actionItems.length ? (
								<section className="flex flex-col gap-2">
									<h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										<ListTodo className="size-3.5" />
										Action items
									</h3>
									<ul className="flex flex-col gap-1.5">
										{content.actionItems.map((item) => (
											<li
												key={item.text}
												className="rounded-2xl border border-violet-200/80 bg-violet-50/60 px-3 py-2 text-sm dark:border-violet-900 dark:bg-violet-950/30"
											>
												<p>{item.text}</p>
												{(item.assignee || item.due) && (
													<p className="mt-1 text-xs text-muted-foreground">
														{[item.assignee, item.due ? `due ${item.due}` : ""]
															.filter(Boolean)
															.join(" · ")}
													</p>
												)}
											</li>
										))}
									</ul>
								</section>
							) : null}

							{manualNotes.length > 0 ? (
								<section className="flex flex-col gap-2">
									<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Your notes
									</h3>
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
								</section>
							) : null}
						</div>
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
