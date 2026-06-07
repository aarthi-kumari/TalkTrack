"use client";

import { Video } from "lucide-react";

import { CreateMeetingDialog } from "@/components/dashboard/CreateMeetingDialog";
import { JoinMeetingDialog } from "@/components/layout/join-meeting-dialog";
import { RecentMeetings } from "@/components/dashboard/RecentMeetings";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStore } from "@/stores/user-store";

export default function DashboardPage() {
	const { dbUser, isSyncing, syncError } = useUserStore();

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
						<CardTitle className="text-base">Upcoming</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">3</p>
						<p className="text-sm text-muted-foreground">meetings this week</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Action items</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">5</p>
						<p className="text-sm text-muted-foreground">open tasks</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">12</p>
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
