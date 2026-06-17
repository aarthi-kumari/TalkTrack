"use client";

import { useEffect, useRef } from "react";

import { startPcmCapture } from "@/lib/pcm-audio-capture";
import { getMeetingSocket } from "@/lib/socket";

type UseMeetingTranscriptionOptions = {
	roomId: string;
	enabled: boolean;
	audioTrack: MediaStreamTrack | null;
};

export function useMeetingTranscription({
	roomId,
	enabled,
	audioTrack,
}: UseMeetingTranscriptionOptions) {
	const captureRef = useRef<ReturnType<typeof startPcmCapture> | null>(null);
	const activeRef = useRef(false);

	useEffect(() => {
		if (!enabled || !audioTrack || audioTrack.readyState !== "live" || !roomId.trim()) {
			return;
		}

		let cancelled = false;
		const activeRoomId = roomId.trim();

		function stopCapture() {
			captureRef.current?.stop();
			captureRef.current = null;
		}

		function waitForTranscriptionStart(
			socket: NonNullable<ReturnType<typeof getMeetingSocket>>,
			sampleRate: number,
		): Promise<void> {
			return new Promise((resolve, reject) => {
				const timeout = window.setTimeout(() => {
					cleanup();
					reject(new Error("Transcription start timed out"));
				}, 15_000);

				const onStarted = (payload: { roomId: string }) => {
					if (payload.roomId !== activeRoomId) return;
					cleanup();
					resolve();
				};

				const onError = (payload: { message: string }) => {
					if (!payload.message.toLowerCase().includes("transcription")) return;
					cleanup();
					reject(new Error(payload.message));
				};

				function cleanup() {
					window.clearTimeout(timeout);
					socket.off("transcription_started", onStarted);
					socket.off("error", onError);
				}

				socket.on("transcription_started", onStarted);
				socket.on("error", onError);
				socket.emit("transcription_start", { roomId: activeRoomId, sampleRate });
			});
		}

		async function start(socket: NonNullable<ReturnType<typeof getMeetingSocket>>) {
			if (cancelled || activeRef.current) return;

			try {
				const sampleRate = new AudioContext().sampleRate;

				await waitForTranscriptionStart(socket, sampleRate);
				if (cancelled) return;

				activeRef.current = true;
				stopCapture();

				captureRef.current = startPcmCapture(audioTrack!, (chunk) => {
					if (cancelled || !activeRef.current) return;
					getMeetingSocket()?.emit("transcription_audio", {
						roomId: activeRoomId,
						chunk,
					});
				});
			} catch (err) {
				console.warn("Meeting transcription failed to start:", err);
			}
		}

		function restart(socket: NonNullable<ReturnType<typeof getMeetingSocket>>) {
			if (cancelled || !enabled) return;
			activeRef.current = false;
			stopCapture();
			void start(socket);
		}

		const socket = getMeetingSocket();
		if (!socket) return;

		const onConnect = () => {
			void start(socket);
		};

		const onStopped = (payload: { roomId: string }) => {
			if (payload.roomId !== activeRoomId || cancelled) return;
			restart(socket);
		};

		socket.on("transcription_stopped", onStopped);

		if (socket.connected) {
			void start(socket);
		} else {
			socket.on("connect", onConnect);
		}

		return () => {
			cancelled = true;
			activeRef.current = false;
			socket.off("connect", onConnect);
			socket.off("transcription_stopped", onStopped);
			stopCapture();
			socket.emit("transcription_stop", { roomId: activeRoomId });
		};
	}, [roomId, enabled, audioTrack]);
}
