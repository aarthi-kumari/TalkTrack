"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getMeetings } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";
import { useUserStore } from "@/stores/user-store";

import { MeetingCard } from "./MeetingCard";

export function RecentMeetings() {
	const { isLoaded, isSignedIn } = useAuth();
	const getToken = useApiToken();
	const { dbUser } = useUserStore();

	const { data, isLoading, error } = useQuery({
		queryKey: ["meetings", dbUser?.id ?? "pending"],
		queryFn: async () => {
			const token = await getToken();
			return getMeetings(token);
		},
		enabled: isLoaded && isSignedIn,
		retry: (failureCount, err) => {
			if (
				err instanceof ApiError &&
				err.code === "USER_NOT_SYNCED" &&
				failureCount < 6
			) {
				return true;
			}
			return failureCount < 1;
		},
		retryDelay: (attempt) => Math.min(500 * attempt, 1500),
		staleTime: 60_000,
	});

	if (!isLoaded || (isLoading && !data && !dbUser)) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-32 rounded-xl" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-sm text-red-600">
				{error instanceof Error ? error.message : "Failed to load meetings"}
			</p>
		);
	}

	if (!data?.length) {
		return (
			<p className="text-sm text-muted-foreground">
				No meetings yet. Create one to get started.
			</p>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{data.map((meeting) => (
				<MeetingCard key={meeting.id} meeting={meeting} />
			))}
		</div>
	);
}
