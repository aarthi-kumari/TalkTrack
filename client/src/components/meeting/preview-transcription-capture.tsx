"use client";

import { useEffect, useState } from "react";

import { useMeetingTranscription } from "@/hooks/use-meeting-transcription";

type PreviewTranscriptionCaptureProps = {
	roomId: string;
	enabled: boolean;
};

export function PreviewTranscriptionCapture({
	roomId,
	enabled,
}: PreviewTranscriptionCaptureProps) {
	const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);

	useEffect(() => {
		if (!enabled) {
			setAudioTrack(null);
			return;
		}

		let stream: MediaStream | null = null;
		let cancelled = false;

		async function acquireMic() {
			try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				if (cancelled) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}
				setAudioTrack(stream.getAudioTracks()[0] ?? null);
			} catch {
				setAudioTrack(null);
			}
		}

		void acquireMic();

		return () => {
			cancelled = true;
			stream?.getTracks().forEach((track) => track.stop());
			setAudioTrack(null);
		};
	}, [enabled]);

	useMeetingTranscription({
		roomId,
		enabled: enabled && Boolean(audioTrack),
		audioTrack,
	});

	return null;
}
