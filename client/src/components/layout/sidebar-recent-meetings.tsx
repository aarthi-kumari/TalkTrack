"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getMeetings } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";

export function SidebarRecentMeetings() {
	const { isLoaded, isSignedIn } = useAuth();
	const getToken = useApiToken();

	const { data, isLoading } = useQuery({
		queryKey: ["meetings", "sidebar"],
		queryFn: async () => {
			const token = await getToken();
			return getMeetings(token);
		},
		enabled: isLoaded && isSignedIn,
		staleTime: 60_000,
	});

	if (!isLoaded || isLoading) {
		return (
			<div className="flex flex-col gap-2 px-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	const recent = (data ?? [])
		.filter((m) => !m.endedAt)
		.slice(0, 5);

	if (recent.length === 0) {
		return (
			<p className="px-2 text-xs text-muted-foreground">
				No active meetings. Create one to get a room ID.
			</p>
		);
	}

	return (
		<SidebarMenu>
			{recent.map((meeting) => (
				<SidebarMenuItem key={meeting.id}>
					<SidebarMenuButton asChild>
						<Link href={`/meet/${meeting.roomId}`}>
							<Calendar />
							<span className="flex flex-1 flex-col items-start gap-0.5 overflow-hidden">
								<span className="truncate">{meeting.title}</span>
								<span className="truncate font-mono text-[10px] text-muted-foreground">
									{meeting.roomId}
								</span>
							</span>
							<Badge variant="secondary" className="shrink-0">
								Join
							</Badge>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
}
