/** Capture mic audio as 16-bit PCM for Deepgram live streaming. */
export type PcmCaptureHandle = {
	stop: () => void;
	sampleRate: number;
};

export function startPcmCapture(
	audioTrack: MediaStreamTrack,
	onChunk: (pcm: ArrayBuffer) => void,
): PcmCaptureHandle {
	const audioContext = new AudioContext();
	const sampleRate = audioContext.sampleRate;
	const stream = new MediaStream([audioTrack]);
	const source = audioContext.createMediaStreamSource(stream);
	const processor = audioContext.createScriptProcessor(4096, 1, 1);
	const silentGain = audioContext.createGain();
	silentGain.gain.value = 0;

	let stopped = false;

	processor.onaudioprocess = (event) => {
		if (stopped) return;

		const input = event.inputBuffer.getChannelData(0);
		const pcm16 = new Int16Array(input.length);
		for (let i = 0; i < input.length; i++) {
			const sample = Math.max(-1, Math.min(1, input[i]));
			pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
		}
		onChunk(pcm16.buffer);
	};

	source.connect(processor);
	processor.connect(silentGain);
	silentGain.connect(audioContext.destination);

	void audioContext.resume();

	return {
		stop() {
			stopped = true;
			processor.disconnect();
			source.disconnect();
			silentGain.disconnect();
			void audioContext.close();
		},
		sampleRate,
	};
}
