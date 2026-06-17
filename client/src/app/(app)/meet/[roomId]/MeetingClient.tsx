"use client";

import type { LocalUserChoices } from "@livekit/components-core";
import {
	LiveKitRoom,
	RoomAudioRenderer,
	useParticipants,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LiveKitMeetingStage } from "@/components/meeting/livekit-meeting-stage";
import { LiveKitPreJoinScreen } from "@/components/meeting/livekit-prejoin-screen";
import { LiveKitSetupBanner } from "@/components/meeting/livekit-setup-banner";
import { LiveKitTranscriptionCapture } from "@/components/meeting/livekit-transcription-capture";
import { MeetingHeader } from "@/components/meeting/meeting-header";
import { MeetingSidePanel } from "@/components/meeting/meeting-side-panel";
import { PreviewTranscriptionCapture } from "@/components/meeting/preview-transcription-capture";
import { VideoGrid } from "@/components/meeting/VideoGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { MeetingRoomProvider, useMeetingRoom } from "@/contexts/meeting-room-context";
import { useApiToken } from "@/hooks/use-api-token";
import type { Meeting } from "@/lib/api";
import {
	getLiveKitStatus,
	getLiveKitToken,
	getMeetingByRoom,
} from "@/lib/api";
import { LIVEKIT_URL } from "@/lib/env";
import { useUserStore } from "@/stores/user-store";

type MeetingClientProps = {
	roomId: string;
};

export function MeetingClient({ roomId }: MeetingClientProps) {
	const getToken = useApiToken();
	const { dbUser } = useUserStore();
	const [meeting, setMeeting] = useState<Meeting | null>(null);
	const [livekitToken, setLivekitToken] = useState<string | null>(null);
	const [serverUrl, setServerUrl] = useState(LIVEKIT_URL);
	const [livekitConfigured, setLivekitConfigured] = useState<boolean | null>(
		null,
	);
	const [livekitMissing, setLivekitMissing] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | null>(
		null,
	);

	useEffect(() => {
		let cancelled = false;

		async function connect() {
			try {
				const status = await getLiveKitStatus();
				if (!cancelled) {
					setLivekitConfigured(status.configured);
					setLivekitMissing(status.missing);
				}

				const token = await getToken();
				const meetingData = await getMeetingByRoom(token, roomId);

				if (cancelled) return;

				if (meetingData.endedAt) {
					setError("This meeting has ended.");
					setMeeting(meetingData);
					setLoading(false);
					return;
				}

				setMeeting(meetingData);

				if (status.configured) {
					try {
						const lk = await getLiveKitToken(token, roomId);
						if (!cancelled) {
							setLivekitToken(lk.token);
							setServerUrl(lk.url || LIVEKIT_URL);
						}
					} catch (lkErr) {
						if (!cancelled) {
							const message =
								lkErr instanceof Error
									? lkErr.message
									: "Failed to get LiveKit token";
							setError(message);
						}
					}
				} else if (!cancelled) {
					setError("LiveKit is not configured on the server.");
				}

				if (!cancelled) setLoading(false);
			} catch (err) {
				if (!cancelled) {
					const message =
						err instanceof Error ? err.message : "Failed to join meeting";
					setError(message);
					setLoading(false);
					toast.error(message);
				}
			}
		}

		connect();

		return () => {
			cancelled = true;
		};
	}, [roomId, getToken]);

	const liveMode = Boolean(
		livekitConfigured && livekitToken && serverUrl && !error?.includes("ended"),
	);
	const title = meeting?.title ?? "Meeting";
	const elapsed = meeting?.startedAt ? formatElapsed(meeting.startedAt) : "0:00";
	const displayName = dbUser?.name ?? dbUser?.email ?? "Guest";

	if (loading) {
		return <MeetingLoadingSkeleton />;
	}

	return (
		<MeetingRoomProvider roomId={roomId}>
			<div className="meeting-app-shell flex min-h-0 flex-1 flex-col overflow-hidden p-4 lg:p-5">
				{!livekitConfigured ? (
					<LiveKitSetupBanner missing={livekitMissing} />
				) : null}

				{error && !meeting?.endedAt && livekitConfigured ? (
					<div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
						{error}
					</div>
				) : null}

				{liveMode && !preJoinChoices ? (
					<LiveKitPreJoinScreen
						displayName={displayName}
						onJoin={setPreJoinChoices}
					/>
				) : null}

				{liveMode && preJoinChoices && livekitToken ? (
					<LiveKitRoom
						token={livekitToken}
						serverUrl={serverUrl}
						connect
						video={preJoinChoices.videoEnabled}
						audio={preJoinChoices.audioEnabled}
						options={{
							videoCaptureDefaults: preJoinChoices.videoDeviceId
								? { deviceId: preJoinChoices.videoDeviceId }
								: undefined,
							audioCaptureDefaults: preJoinChoices.audioDeviceId
								? { deviceId: preJoinChoices.audioDeviceId }
								: undefined,
						}}
						onDisconnected={() => {
							toast.info("Left the video room");
						}}
						className="meeting-app-shell flex min-h-0 flex-1 flex-col"
					>
						<LiveKitMeetingLayout
							roomId={roomId}
							title={title}
							elapsed={elapsed}
						/>
						<RoomAudioRenderer />
					</LiveKitRoom>
				) : null}

				{!liveMode ? (
					<PreviewMeetingContent
						roomId={roomId}
						title={title}
						elapsed={elapsed}
						ended={Boolean(meeting?.endedAt)}
					/>
				) : null}
			</div>
		</MeetingRoomProvider>
	);
}

function LiveKitMeetingLayout({
	roomId,
	title,
	elapsed,
}: {
	roomId: string;
	title: string;
	elapsed: string;
}) {
	const lkParticipants = useParticipants();
	const { participants: socketParticipants, transcriptionEnabled } =
		useMeetingRoom();
	const participantCount = Math.max(
		lkParticipants.length,
		socketParticipants.length,
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<LiveKitTranscriptionCapture
				roomId={roomId}
				enabled={transcriptionEnabled}
			/>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
				<MeetingHeader
					title={title}
					roomId={roomId}
					participantCount={participantCount}
					recordingLabel="Live"
					elapsed={elapsed}
					inFrame
				/>

				<div className="meeting-room-grid min-h-0 flex-1 gap-4 p-4 pt-0">
					<div className="meeting-video-shell overflow-hidden rounded-2xl border border-border/60 bg-black/95">
						<LiveKitMeetingStage />
					</div>
					<MeetingSidePanel roomId={roomId} />
				</div>
			</div>
		</div>
	);
}

function PreviewMeetingContent({
	roomId,
	title,
	elapsed,
	ended,
}: {
	roomId: string;
	title: string;
	elapsed: string;
	ended: boolean;
}) {
	const { participants, transcriptionEnabled } = useMeetingRoom();

	return (
		<div className="meeting-app-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
			<PreviewTranscriptionCapture
				roomId={roomId}
				enabled={transcriptionEnabled && !ended}
			/>
			<MeetingHeader
				title={title}
				roomId={roomId}
				participantCount={participants.length}
				recordingLabel={ended ? "Ended" : "Preview"}
				elapsed={elapsed}
				inFrame
			/>

			<div className="meeting-room-grid min-h-0 flex-1 gap-4 p-4 pt-0">
				<div className="meeting-video-shell overflow-hidden rounded-2xl border border-border/60">
					<VideoGrid mode="preview" />
				</div>
				<MeetingSidePanel roomId={roomId} />
			</div>
		</div>
	);
}

function MeetingLoadingSkeleton() {
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
			<Skeleton className="h-24 w-full rounded-3xl" />
			<Skeleton className="min-h-[480px] flex-1 rounded-3xl" />
			<div className="grid gap-4 lg:grid-cols-2">
				<Skeleton className="h-80 rounded-3xl" />
				<Skeleton className="h-80 rounded-3xl" />
			</div>
		</div>
	);
}

function formatElapsed(startedAt: string) {
	const started = new Date(startedAt).getTime();
	if (Number.isNaN(started)) return "0:00";

	const totalSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	}

	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
