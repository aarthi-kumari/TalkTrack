"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Meeting } from "@/lib/api";
import { endMeeting } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";
import { useUserStore } from "@/stores/user-store";

import { CopyRoomIdButton, RoomIdDisplay } from "@/components/meeting/copy-room-id";

type MeetingCardProps = {
	meeting: Meeting;
};

export function MeetingCard({ meeting }: MeetingCardProps) {
	const getToken = useApiToken();
	const { dbUser } = useUserStore();
	const queryClient = useQueryClient();

	const isHost = dbUser?.id === meeting.hostId;
	const ended = Boolean(meeting.endedAt);

	const endMutation = useMutation({
		mutationFn: async () => {
			const token = await getToken();
			return endMeeting(token, meeting.id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meetings"] });
			toast.success("Meeting ended");
		},
		onError: (err: Error) => toast.error(err.message),
	});

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-2">
				<div>
					<h3 className="font-medium">{meeting.title}</h3>
					<p className="mt-1 text-xs text-muted-foreground">
						{new Date(meeting.startedAt).toLocaleString()}
						{ended && " · Ended"}
					</p>
					<RoomIdDisplay roomId={meeting.roomId} className="mt-2" />
				</div>
				{ended ? (
					<span className="rounded-md bg-muted px-2 py-0.5 text-xs">Ended</span>
				) : (
					<span className="rounded-md bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-200">
						Active
					</span>
				)}
			</div>

			<div className="flex flex-wrap gap-2">
				{!ended && (
					<Button asChild size="sm">
						<Link href={`/meet/${meeting.roomId}`}>Join</Link>
					</Button>
				)}
				<CopyRoomIdButton roomId={meeting.roomId} />
				{isHost && !ended && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => endMutation.mutate()}
						disabled={endMutation.isPending}
					>
						End meeting
					</Button>
				)}
			</div>
		</div>
	);
}
