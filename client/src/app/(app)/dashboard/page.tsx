"use client";

import { Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { CreateMeetingDialog } from "@/components/dashboard/CreateMeetingDialog";
import { JoinMeetingDialog } from "@/components/layout/join-meeting-dialog";
import { RecentMeetings } from "@/components/dashboard/RecentMeetings";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";
import { useUserStore } from "@/stores/user-store";

export default function DashboardPage() {
	const { dbUser, isSyncing, syncError } = useUserStore();
	const getToken = useApiToken();

	const { data: summary } = useQuery({
		queryKey: ["dashboard-summary", dbUser?.id],
		queryFn: async () => {
			const token = await getToken();
			return getDashboardSummary(token);
		},
		enabled: Boolean(dbUser),
	});

	return (
		<div className="flex flex-col gap-8 p-6">
			<PageHeader
				title="Dashboard"
				description={
					dbUser && !isSyncing
						? `Welcome back, ${dbUser.name ?? dbUser.email}`
						: "Your meetings and AI assistant at a glance"
				}
			>
				<div className="flex flex-wrap gap-2">
					<JoinMeetingDialog
						trigger={
							<Button variant="outline" size="sm">
								Join with room ID
							</Button>
						}
					/>
					<CreateMeetingDialog trigger={<Button size="sm">New meeting</Button>} />
				</div>
			</PageHeader>

			{isSyncing && (
				<p className="text-sm text-muted-foreground">Syncing account…</p>
			)}
			{syncError && <p className="text-sm text-red-600">{syncError}</p>}

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Active meetings</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{summary?.activeMeetings ?? 0}</p>
						<p className="text-sm text-muted-foreground">currently in progress</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Action items</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{summary?.openActionItems ?? 0}</p>
						<p className="text-sm text-muted-foreground">from meeting notes</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{summary?.notesCount ?? 0}</p>
						<p className="text-sm text-muted-foreground">saved summaries</p>
					</CardContent>
				</Card>
			</div>

			<section className="flex flex-col gap-4">
				<div className="flex items-center gap-2">
					<Video className="size-4 text-primary" />
					<h2 className="text-lg font-semibold">Recent meetings</h2>
				</div>
				<RecentMeetings />
			</section>
		</div>
	);
}
