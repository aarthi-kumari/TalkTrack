"use client";

import { useRouter } from "next/navigation";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Bot, Mic, MicOff, MonitorUp, MoreHorizontal, PhoneOff, Users, Video, VideoOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

type MeetingControlBarProps = {
	mode?: "live" | "preview";
	participantCount?: number;
};

export function MeetingControlBar({
	mode = "live",
	participantCount,
}: MeetingControlBarProps) {
	if (mode === "preview") {
		return <PreviewControlBar participantCount={participantCount} />;
	}

	return <LiveControlBar participantCount={participantCount} />;
}

function LiveControlBar({ participantCount }: { participantCount?: number }) {
	const room = useRoomContext();
	const { localParticipant } = useLocalParticipant();
	const router = useRouter();

	const micOn = localParticipant.isMicrophoneEnabled;
	const camOn = localParticipant.isCameraEnabled;
	const screenOn = localParticipant.isScreenShareEnabled;

	async function toggleMic() {
		await localParticipant.setMicrophoneEnabled(!micOn);
	}

	async function toggleCam() {
		await localParticipant.setCameraEnabled(!camOn);
	}

	async function toggleScreen() {
		await localParticipant.setScreenShareEnabled(!screenOn);
	}

	function leave() {
		room.disconnect();
		router.push("/dashboard");
	}

	return (
		<div className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={micOn ? "outline" : "destructive"}
						size="icon"
						onClick={toggleMic}
						className="shadow-sm"
					>
						{micOn ? <Mic /> : <MicOff />}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{micOn ? "Mute" : "Unmute"}</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={camOn ? "outline" : "destructive"}
						size="icon"
						onClick={toggleCam}
						className="shadow-sm"
					>
						{camOn ? <Video /> : <VideoOff />}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{camOn ? "Stop camera" : "Start camera"}</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={screenOn ? "secondary" : "outline"}
						size="icon"
						onClick={toggleScreen}
						className="shadow-sm"
					>
						<MonitorUp />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Share screen</TooltipContent>
			</Tooltip>

			<Button variant="outline" size="icon" className="relative shadow-sm">
				<Users />
				{participantCount != null && participantCount > 0 ? (
					<Badge className="absolute -top-1 -right-1 size-4 justify-center p-0 text-[10px]">
						{participantCount}
					</Badge>
				) : null}
			</Button>
			<Button variant="secondary" size="icon" className="bg-primary/15 text-primary shadow-sm">
				<Bot />
			</Button>

			<Button variant="ghost" size="icon" className="shadow-sm">
				<MoreHorizontal />
			</Button>

			<Button variant="destructive" onClick={leave} className="ml-4 gap-2 rounded-full px-4 py-2 shadow-md">
				<PhoneOff />
				Leave
			</Button>
		</div>
	);
}

function PreviewControlBar({ participantCount }: { participantCount?: number }) {
	return (
		<div className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
			<Button variant="outline" size="icon-sm" disabled>
				<Mic />
			</Button>
			<Button variant="outline" size="icon-sm" disabled>
				<Video />
			</Button>
			<Button variant="outline" size="icon-sm" disabled>
				<MonitorUp />
			</Button>
			<Button variant="outline" size="icon-sm" className="relative" disabled>
				<Users />
				{participantCount != null && participantCount > 0 ? (
					<Badge className="absolute -top-1 -right-1 size-4 justify-center p-0 text-[10px]">
						{participantCount}
					</Badge>
				) : null}
			</Button>
			<Button variant="secondary" size="icon-sm" className="bg-primary/15 text-primary" disabled>
				<Bot />
			</Button>
			<Button variant="ghost" size="icon-sm" disabled>
				<MoreHorizontal />
			</Button>
			<Button variant="destructive" className="ml-4 gap-2 rounded-full px-4" disabled>
				<PhoneOff />
				Leave
			</Button>
		</div>
	);
}
