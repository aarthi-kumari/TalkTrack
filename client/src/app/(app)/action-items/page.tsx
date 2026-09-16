"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getActionItems } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";

export default function ActionItemsPage() {
	const getToken = useApiToken();
	const { data, isLoading, error } = useQuery({
		queryKey: ["action-items"],
		queryFn: async () => {
			const token = await getToken();
			return getActionItems(token);
		},
	});

	const items = data?.items ?? [];

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Action Items"
				description="Tasks extracted from your meetings"
			/>

			<div className="flex flex-col gap-3">
				{isLoading ? (
					<>
						<Skeleton className="h-20 w-full rounded-xl" />
						<Skeleton className="h-20 w-full rounded-xl" />
					</>
				) : error ? (
					<p className="text-sm text-red-600">
						{error instanceof Error
							? error.message
							: "Failed to load action items"}
					</p>
				) : items.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No action items yet. They appear when AI notes capture tasks from a
						meeting.
					</p>
				) : (
					items.map((item) => (
						<Card key={item.id}>
							<CardContent className="flex items-start justify-between gap-3 py-4">
								<div className="flex flex-col gap-1">
									<p className="font-medium">{item.text}</p>
									<p className="text-sm text-muted-foreground">
										<Link
											href={`/notes/${item.meetingId}`}
											className="hover:underline"
										>
											{item.meetingTitle}
										</Link>
										{item.assignee ? ` · ${item.assignee}` : ""}
										{item.due ? ` · Due ${item.due}` : ""}
									</p>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>
		</div>
	);
}
