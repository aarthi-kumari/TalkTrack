"use client";

import { useRouter } from "next/navigation";
import { Circle, PhoneOff, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { CopyRoomIdButton, RoomIdDisplay } from "@/components/meeting/copy-room-id";

type MeetingHeaderProps = {
	title: string;
	roomId?: string;
	participantCount?: number;
	recordingLabel?: string;
	elapsed?: string;
	onLeave?: () => void;
	inFrame?: boolean;
};

export function MeetingHeader({
	title,
	roomId,
	participantCount,
	recordingLabel = "Recording",
	elapsed = "0:00",
	inFrame = false,
	onLeave,
}: MeetingHeaderProps) {
	const router = useRouter();

	function handleLeave() {
		if (onLeave) {
			onLeave();
			return;
		}

		router.push("/dashboard");
	}

	return (
		<header
			className={
				inFrame
					? "shrink-0 border-b border-border/60 px-4 py-3"
					: "shrink-0 rounded-3xl border border-border/70 bg-card px-4 py-4 shadow-sm lg:px-5"
			}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						<Badge variant="secondary" className="gap-1.5 rounded-full px-2.5">
							<Circle className="size-2 fill-red-500 text-red-500" />
							{recordingLabel}
						</Badge>
						<span className="font-mono text-xs tabular-nums">{elapsed}</span>
						{participantCount != null && participantCount > 0 ? (
							<Badge variant="outline" className="gap-1 rounded-full px-2.5">
								<Users className="size-3.5" />
								{participantCount}{" "}
								{participantCount === 1 ? "participant" : "participants"}
							</Badge>
						) : null}
					</div>

					<h1 className="truncate text-lg font-semibold tracking-tight text-foreground lg:text-xl">
						{title}
					</h1>

					{roomId ? (
						<div className="flex flex-wrap items-center gap-2">
							<RoomIdDisplay roomId={roomId} />
							<CopyRoomIdButton roomId={roomId} size="sm" />
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							Share the room ID so others can join this meeting.
						</p>
					)}
				</div>

				<Button
					variant="destructive"
					size="sm"
					onClick={handleLeave}
					className="shrink-0 gap-2 rounded-full bg-destructive px-4 text-white hover:bg-destructive/90"
				>
					<PhoneOff className="size-4" />
					Leave
				</Button>
			</div>
		</header>
	);
}
