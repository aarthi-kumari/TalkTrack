"use client";

import { ParticipantTile, useParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Users, VideoOff } from "lucide-react";

import { useMeetingRoom } from "@/contexts/meeting-room-context";

import { ParticipantGrid } from "./participant-grid";

type VideoGridProps = {
	mode?: "live" | "preview";
};

export function VideoGrid({ mode = "live" }: VideoGridProps) {
	if (mode === "live") {
		return <LiveVideoGrid />;
	}

	return <PreviewVideoGrid />;
}

function LiveVideoGrid() {
	const lkParticipants = useParticipants();
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: true },
	);

	if (tracks.length > 0) {
		const cols =
			tracks.length === 1
				? "grid-cols-1"
				: tracks.length === 2
					? "grid-cols-2"
					: "lg:grid-cols-2";

		return (
			<div
				className={`grid min-h-[520px] flex-1 gap-4 rounded-3xl border border-border/70 bg-card/95 p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] lg:min-h-[640px] lg:p-5 ${cols}`}
			>
				{tracks.map((trackRef) => (
					<ParticipantTile
						key={trackRef.participant.sid + trackRef.source}
						trackRef={trackRef}
						className="aspect-video overflow-hidden rounded-2xl bg-muted ring-1 ring-border/70"
					/>
				))}
			</div>
		);
	}

	const roster = lkParticipants.map((participant) => ({
		id: participant.identity,
		name: participant.name || participant.identity,
	}));

	if (roster.length > 0) {
		return <ParticipantGrid participants={roster} />;
	}

	return <EmptyVideoGrid />;
}

function PreviewVideoGrid() {
	const { participants, connected } = useMeetingRoom();

	const roster = participants.map((participant) => ({
		id: participant.userId,
		name: participant.displayName,
	}));

	if (roster.length > 0) {
		return <ParticipantGrid participants={roster} />;
	}

	return (
		<EmptyVideoGrid
			hint={
				connected
					? "Waiting for others to join. Share the room ID from the header."
					: "Connecting to the meeting room…"
			}
		/>
	);
}

function EmptyVideoGrid({ hint }: { hint?: string }) {
	return (
		<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card p-6 text-center">
			<div className="flex size-14 items-center justify-center rounded-full bg-muted">
				<VideoOff className="size-7 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<p className="text-base font-medium">No one in the room yet</p>
				<p className="max-w-sm text-sm text-muted-foreground">
					{hint ??
						"Turn on your camera or wait for others to join the meeting."}
				</p>
			</div>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Users className="size-3.5" />
				<span>Participants appear here when they join</span>
			</div>
		</div>
	);
}
