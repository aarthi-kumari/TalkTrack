"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { CopyRoomIdButton, RoomIdDisplay } from "@/components/meeting/copy-room-id";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMeetings } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";

export default function MeetingsPage() {
	const [filter, setFilter] = useState("all");
	const getToken = useApiToken();

	const { data: apiMeetings, isLoading } = useQuery({
		queryKey: ["meetings"],
		queryFn: async () => {
			const token = await getToken();
			return getMeetings(token);
		},
	});

	const meetings =
		apiMeetings?.map((m) => ({
			id: m.id,
			title: m.title,
			date: new Date(m.startedAt).toLocaleString(),
			duration: m.endedAt ? "Ended" : "Active",
			roomId: m.roomId,
			status: m.endedAt ? ("ended" as const) : ("active" as const),
		})) ?? [];

	const filtered = meetings.filter((m) => {
		if (filter === "active") return m.status !== "ended";
		if (filter === "ended") return m.status === "ended";
		return true;
	});

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Meetings"
				description="Browse and join your past and upcoming meetings"
			/>

			<Tabs value={filter} onValueChange={setFilter}>
				<TabsList>
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="active">Active</TabsTrigger>
					<TabsTrigger value="ended">Ended</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="flex flex-col gap-3">
				{isLoading ? (
					<>
						<Skeleton className="h-24 w-full rounded-xl" />
						<Skeleton className="h-24 w-full rounded-xl" />
					</>
				) : filtered.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No meetings yet. Create one from the sidebar to get a room ID.
					</p>
				) : (
					filtered.map((m) => (
						<Card key={m.id}>
							<CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
								<div>
									<p className="font-medium">{m.title}</p>
									<p className="text-sm text-muted-foreground">{m.date}</p>
									<RoomIdDisplay roomId={m.roomId} className="mt-2" />
								</div>
								<div className="flex items-center gap-2">
									<Badge variant={m.status === "ended" ? "secondary" : "default"}>
										{m.duration}
									</Badge>
									<CopyRoomIdButton roomId={m.roomId} />
									{m.status !== "ended" && (
										<Button asChild size="sm">
											<Link href={`/meet/${m.roomId}`}>Join</Link>
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>
		</div>
	);
}
