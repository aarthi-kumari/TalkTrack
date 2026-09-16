"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteEndedMeetingButton } from "@/components/dashboard/DeleteEndedMeetingButton";
import { getMeetingAnalytics, getMeetingNote } from "@/lib/api";
import { downloadTextFile, notesToMarkdown } from "@/lib/notes-markdown";
import { useApiToken } from "@/hooks/use-api-token";

function formatSeconds(seconds: number) {
	const total = Math.max(0, Math.round(seconds));
	const minutes = Math.floor(total / 60);
	const rest = total % 60;
	if (minutes === 0) return `${rest}s`;
	return `${minutes}m ${rest}s`;
}

export function NoteDetail({ meetingId }: { meetingId: string }) {
	const getToken = useApiToken();

	const { data, isLoading, error } = useQuery({
		queryKey: ["note", meetingId],
		queryFn: async () => {
			const token = await getToken();
			return getMeetingNote(token, meetingId);
		},
	});

	const analyticsQuery = useQuery({
		queryKey: ["note-analytics", meetingId],
		queryFn: async () => {
			const token = await getToken();
			return getMeetingAnalytics(token, meetingId);
		},
	});

	const meeting = data?.meeting;
	const content = data?.note?.content;
	const analytics = content?.analytics ?? analyticsQuery.data?.analytics;

	function exportMarkdown() {
		if (!meeting) return;
		const markdown = notesToMarkdown({
			title: meeting.title,
			startedAt: meeting.startedAt,
			content: content ?? null,
		});
		downloadTextFile(`${meeting.title.replace(/\s+/g, "-").toLowerCase()}-notes.md`, markdown);
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-48 w-full rounded-xl" />
			</div>
		);
	}

	if (error || !meeting) {
		return (
			<div className="flex flex-col gap-4 p-6">
				<p className="text-sm text-red-600">
					{error instanceof Error ? error.message : "Notes not found"}
				</p>
				<Button asChild variant="outline" size="sm">
					<Link href="/notes">Back to notes</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={meeting.title}
				description={new Date(meeting.startedAt).toLocaleString()}
			>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" size="sm" onClick={exportMarkdown}>
						<Download className="size-4" />
						Export
					</Button>
					{!meeting.endedAt ? (
						<Button asChild size="sm">
							<Link href={`/meet/${meeting.roomId}`}>Rejoin</Link>
						</Button>
					) : (
						<DeleteEndedMeetingButton
							meetingId={meeting.id}
							hostId={meeting.hostId}
							endedAt={meeting.endedAt}
							title={meeting.title}
							redirectTo="/notes"
						/>
					)}
				</div>
			</PageHeader>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
				<div className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm leading-relaxed text-foreground/85">
								{content?.summary || "No summary yet."}
							</p>
						</CardContent>
					</Card>

					{content?.keyPoints.length ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Key points</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="flex flex-col gap-2 text-sm">
									{content.keyPoints.map((item) => (
										<li key={item}>• {item}</li>
									))}
								</ul>
							</CardContent>
						</Card>
					) : null}

					{content?.decisions.length ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Decisions</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="flex flex-col gap-2 text-sm">
									{content.decisions.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							</CardContent>
						</Card>
					) : null}

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Action items</CardTitle>
						</CardHeader>
						<CardContent>
							{content?.actionItems.length ? (
								<ul className="flex flex-col gap-3">
									{content.actionItems.map((item) => (
										<li key={item.text} className="rounded-xl border border-border/70 p-3">
											<p className="text-sm font-medium">{item.text}</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{[item.assignee, item.due ? `Due ${item.due}` : ""]
													.filter(Boolean)
													.join(" · ") || "Unassigned"}
											</p>
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-muted-foreground">
									No action items captured.
								</p>
							)}
						</CardContent>
					</Card>

					{content?.manualNotes.length ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Manual notes</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-2">
								{content.manualNotes.map((item, index) => (
									<p key={`${index}-${item.slice(0, 16)}`} className="text-sm">
										{item}
									</p>
								))}
							</CardContent>
						</Card>
					) : null}
				</div>

				<Card className="h-fit">
					<CardHeader>
						<CardTitle className="text-base">Analytics</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">
								{analytics?.transcriptCount ?? 0} transcript lines
							</Badge>
							<Badge variant="secondary">
								{analytics?.messageCount ?? 0} messages
							</Badge>
							<Badge variant="outline">
								{analytics?.aiInvocationCount ?? 0} AI replies
							</Badge>
						</div>
						<div className="flex flex-col gap-2">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Talk time
							</p>
							{analytics?.talkTimeBySpeaker.length ? (
								<ul className="flex flex-col gap-2 text-sm">
									{analytics.talkTimeBySpeaker.map((row) => (
										<li
											key={row.speaker}
											className="flex items-center justify-between gap-3"
										>
											<span className="truncate">{row.speaker}</span>
											<span className="text-muted-foreground">
												{formatSeconds(row.seconds)}
											</span>
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-muted-foreground">
									Talk time appears after the meeting is transcribed.
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
