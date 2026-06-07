"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CirclePlus } from "lucide-react";

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
import { meetingPath, parseMeetingRoomId } from "@/lib/meeting-link";

type JoinMeetingDialogProps = {
	trigger?: React.ReactNode;
};

export function JoinMeetingDialog({ trigger }: JoinMeetingDialogProps) {
	const [open, setOpen] = useState(false);
	const [roomIdInput, setRoomIdInput] = useState("");
	const router = useRouter();

	function handleJoin(e: React.FormEvent) {
		e.preventDefault();
		const roomId = parseMeetingRoomId(roomIdInput);
		if (!roomId) return;

		setOpen(false);
		setRoomIdInput("");
		router.push(meetingPath(roomId));
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button variant="outline" className="w-full justify-start">
						<CirclePlus data-icon="inline-start" />
						Join Meeting
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Join meeting</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleJoin} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="room-id">Room ID or link</Label>
						<Input
							id="room-id"
							placeholder="Paste room ID or meeting link"
							value={roomIdInput}
							onChange={(e) => setRoomIdInput(e.target.value)}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit">Join</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
