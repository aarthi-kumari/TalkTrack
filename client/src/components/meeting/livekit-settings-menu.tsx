"use client";

import { MediaDeviceMenu } from "@livekit/components-react";

/** Device settings panel for LiveKit ControlBar settings toggle. */
export function LiveKitSettingsMenu() {
	return (
		<div className="flex w-full max-w-md flex-col gap-4 p-2">
			<h2 className="text-lg font-semibold">Media devices</h2>
			<div className="flex flex-col gap-3">
				<label className="text-sm font-medium">Microphone</label>
				<MediaDeviceMenu kind="audioinput" />
				<label className="text-sm font-medium">Camera</label>
				<MediaDeviceMenu kind="videoinput" />
				<label className="text-sm font-medium">Speaker</label>
				<MediaDeviceMenu kind="audiooutput" />
			</div>
		</div>
	);
}
