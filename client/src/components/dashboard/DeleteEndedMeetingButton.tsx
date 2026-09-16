"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { deleteMeeting } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";
import { useUserStore } from "@/stores/user-store";

type DeleteEndedMeetingButtonProps = {
	meetingId: string;
	hostId: string;
	endedAt: string | null;
	title: string;
	redirectTo?: string;
};

export function DeleteEndedMeetingButton({
	meetingId,
	hostId,
	endedAt,
	title,
	redirectTo,
}: DeleteEndedMeetingButtonProps) {
	const [open, setOpen] = useState(false);
	const getToken = useApiToken();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { dbUser } = useUserStore();

	const isHost = dbUser?.id === hostId;
	const ended = Boolean(endedAt);

	const mutation = useMutation({
		mutationFn: async () => {
			const token = await getToken();
			return deleteMeeting(token, meetingId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meetings"] });
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			queryClient.invalidateQueries({ queryKey: ["action-items"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
			queryClient.invalidateQueries({ queryKey: ["note", meetingId] });
			setOpen(false);
			toast.success("Meeting deleted");
			if (redirectTo) {
				router.push(redirectTo);
			}
		},
		onError: (err: Error) => toast.error(err.message),
	});

	if (!isHost || !ended) return null;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="destructive" size="sm">
					Delete
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete this meeting?</DialogTitle>
					<DialogDescription>
						This permanently removes “{title}”, including notes, chat, and
						transcripts. This cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={mutation.isPending}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => mutation.mutate()}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Deleting…" : "Delete meeting"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
