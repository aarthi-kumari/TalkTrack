"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMeeting } from "@/lib/api";
import { copyMeetingLink } from "@/lib/meeting-link";
import { useApiToken } from "@/hooks/use-api-token";

type CreateMeetingDialogProps = {
	trigger?: React.ReactNode;
};

export function CreateMeetingDialog({ trigger }: CreateMeetingDialogProps) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const router = useRouter();
	const getToken = useApiToken();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (meetingTitle: string) => {
			const token = await getToken();
			return createMeeting(token, meetingTitle);
		},
		onSuccess: async (meeting) => {
			queryClient.invalidateQueries({ queryKey: ["meetings"] });
			setOpen(false);
			setTitle("");
			await copyMeetingLink(meeting.roomId);
			toast.success("Meeting created — link copied to clipboard", {
				description: `Room ID: ${meeting.roomId}`,
			});
			router.push(`/meet/${meeting.roomId}`);
		},
		onError: (err: Error) => toast.error(err.message),
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = title.trim();
		if (!trimmed) return;
		mutation.mutate(trimmed);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button className="w-full justify-start">
						<Plus data-icon="inline-start" />
						New Meeting
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create meeting</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="meeting-title">Title</Label>
						<Input
							id="meeting-title"
							placeholder="Meeting title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							disabled={mutation.isPending}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={mutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? "Creating…" : "Create & join"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
