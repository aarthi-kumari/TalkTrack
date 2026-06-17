"use client";

import { useLocalParticipant, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo } from "react";

import { useMeetingTranscription } from "@/hooks/use-meeting-transcription";

type LiveKitTranscriptionCaptureProps = {
	roomId: string;
	enabled: boolean;
};

/** Streams local LiveKit mic audio to the server for Deepgram transcription. */
export function LiveKitTranscriptionCapture({
	roomId,
	enabled,
}: LiveKitTranscriptionCaptureProps) {
	const { localParticipant } = useLocalParticipant();
	const micOn = localParticipant.isMicrophoneEnabled;

	const micTracks = useTracks([Track.Source.Microphone], { onlySubscribed: false });

	const micTrack = useMemo(() => {
		const localMic = micTracks.find(
			(track) =>
				track.participant.isLocal && track.source === Track.Source.Microphone,
		);
		return localMic?.publication.track?.mediaStreamTrack ?? null;
	}, [micTracks]);

	useMeetingTranscription({
		roomId,
		enabled: enabled && micOn,
		audioTrack: micTrack,
	});

	return null;
}
