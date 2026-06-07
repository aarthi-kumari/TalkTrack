"use client";

import { useRouter } from "next/navigation";
import { Circle, MessageSquareText, Settings, Users, PhoneOff } from "lucide-react";

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
 	elapsed = "25:34",
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

	const outerClass = inFrame
		? "flex shrink-0 flex-col gap-1 px-3 py-2"
		: "flex shrink-0 flex-col gap-4 rounded-3xl border border-border/70 bg-card/95 px-4 py-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur lg:px-5";

	const titleClass = inFrame ? "truncate text-lg font-semibold tracking-tight lg:text-xl" : "truncate text-xl font-semibold tracking-tight lg:text-2xl";
	const descClass = inFrame ? "text-sm text-muted-foreground" : "max-w-2xl text-sm text-muted-foreground";

	return (
		<header className={outerClass}>
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Badge variant="secondary" className="gap-1 rounded-full px-2.5">
							<Circle className="size-2 fill-current text-red-500" />
							{recordingLabel}
						</Badge>
						<span>{elapsed}</span>
					</div>
					<div className="flex items-center gap-3">
						<h1 className={titleClass}>
							{title}
						</h1>
						{participantCount != null && participantCount > 0 ? (
							<Badge variant="outline" className="hidden rounded-full px-2.5 lg:inline-flex">
								<Users className="mr-1 size-3.5" />
								{participantCount}{" "}
								{participantCount === 1 ? "participant" : "participants"}
							</Badge>
						) : null}
					</div>
					<p className={descClass}>
						Share the room ID so others can join this meeting.
					</p>
					{roomId ? (
						<div className="flex flex-wrap items-center gap-2">
							<RoomIdDisplay roomId={roomId} />
							<CopyRoomIdButton roomId={roomId} size="sm" />
						</div>
					) : null}
				</div>

				<div className="flex items-center gap-2">
						<Button variant="outline" size="icon-sm" aria-label="Participants">
							<Users />
						</Button>
						<Button variant="outline" size="icon-sm" aria-label="Messages">
							<MessageSquareText />
						</Button>
						<Button variant="outline" size="icon-sm" aria-label="Settings">
							<Settings />
						</Button>
						<Button variant="destructive" onClick={handleLeave} className="gap-2 rounded-full px-3 py-2 shadow-md">
							<PhoneOff className="mr-2" />
							Leave
						</Button>
					</div>
			</div>
		</header>
	);
}
