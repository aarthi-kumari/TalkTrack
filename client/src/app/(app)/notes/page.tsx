"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMeetingNotes } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";

export default function NotesPage() {
	const getToken = useApiToken();
	const { data, isLoading, error } = useQuery({
		queryKey: ["notes"],
		queryFn: async () => {
			const token = await getToken();
			return getMeetingNotes(token);
		},
	});

	const notes = data?.notes ?? [];

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Notes"
				description="AI-generated meeting notes and summaries"
			/>

			<div className="flex flex-col gap-4">
				{isLoading ? (
					<>
						<Skeleton className="h-28 w-full rounded-xl" />
						<Skeleton className="h-28 w-full rounded-xl" />
					</>
				) : error ? (
					<p className="text-sm text-red-600">
						{error instanceof Error ? error.message : "Failed to load notes"}
					</p>
				) : notes.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No notes yet. Join a meeting with transcription and AI keys enabled
						to generate summaries automatically.
					</p>
				) : (
					notes.map((note) => (
						<Link key={note.id} href={`/notes/${note.meetingId}`}>
							<Card className="transition-colors hover:bg-muted/40">
								<CardHeader>
									<CardTitle className="text-base">
										{note.meeting.title}
									</CardTitle>
									<p className="text-sm text-muted-foreground">
										{new Date(note.meeting.startedAt).toLocaleString()}
									</p>
								</CardHeader>
								<CardContent>
									<p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
										{note.content.summary ||
											note.content.manualNotes[0] ||
											"No summary yet."}
									</p>
								</CardContent>
							</Card>
						</Link>
					))
				)}
			</div>
		</div>
	);
}
