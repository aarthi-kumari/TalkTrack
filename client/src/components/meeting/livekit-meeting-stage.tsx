"use client";

/**
 * LiveKit official video UI: grid/focus layouts, screen share, and control bar.
 * Chat is disabled here — use the app ChatPanel (Socket.IO) in the sidebar.
 */
import {
	CarouselLayout,
	ConnectionStateToast,
	FocusLayout,
	FocusLayoutContainer,
	GridLayout,
	LayoutContextProvider,
	ParticipantTile,
	useCreateLayoutContext,
	usePinnedTracks,
	useTracks,
} from "@livekit/components-react";
import { ControlBar } from "@livekit/components-react/prefabs";
import {
	isEqualTrackRef,
	isTrackReference,
	isWeb,
	getTrackReferenceId,
	type TrackReferenceOrPlaceholder,
	type WidgetState,
} from "@livekit/components-core";
import { RoomEvent, Track } from "livekit-client";
import { useEffect, useMemo, useRef, useState } from "react";

import { LiveKitSettingsMenu } from "./livekit-settings-menu";

/** Drop camera placeholders once the real track exists (avoids GridLayout pagination crash). */
function stabilizeTrackList(
	tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder[] {
	const realCameraParticipants = new Set(
		tracks
			.filter(isTrackReference)
			.filter((track) => track.source === Track.Source.Camera)
			.map((track) => track.participant.identity),
	);

	return tracks.filter((track) => {
		if (
			!isTrackReference(track) &&
			track.source === Track.Source.Camera &&
			realCameraParticipants.has(track.participant.identity)
		) {
			return false;
		}
		return true;
	});
}

export function LiveKitMeetingStage() {
	const [widgetState, setWidgetState] = useState<WidgetState>({
		showChat: false,
		unreadMessages: 0,
		showSettings: false,
	});
	const lastAutoFocusedScreenShareTrack =
		useRef<TrackReferenceOrPlaceholder | null>(null);

	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
	);

	const layoutTracks = useMemo(() => stabilizeTrackList(tracks), [tracks]);
	const layoutKey = useMemo(
		() => layoutTracks.map(getTrackReferenceId).join("|"),
		[layoutTracks],
	);

	const layoutContext = useCreateLayoutContext();

	const screenShareTracks = layoutTracks
		.filter(isTrackReference)
		.filter((track) => track.publication.source === Track.Source.ScreenShare);

	const focusTrack = usePinnedTracks(layoutContext)?.[0];
	const carouselTracks = useMemo(
		() =>
			stabilizeTrackList(
				layoutTracks.filter((track) => !isEqualTrackRef(track, focusTrack)),
			),
		[layoutTracks, focusTrack],
	);
	const carouselKey = useMemo(
		() => carouselTracks.map(getTrackReferenceId).join("|"),
		[carouselTracks],
	);

	useEffect(() => {
		if (
			screenShareTracks.some((track) => track.publication.isSubscribed) &&
			lastAutoFocusedScreenShareTrack.current === null
		) {
			layoutContext.pin.dispatch?.({
				msg: "set_pin",
				trackReference: screenShareTracks[0],
			});
			lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
		} else if (
			lastAutoFocusedScreenShareTrack.current &&
			!screenShareTracks.some(
				(track) =>
					track.publication.trackSid ===
					lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
			)
		) {
			layoutContext.pin.dispatch?.({ msg: "clear_pin" });
			lastAutoFocusedScreenShareTrack.current = null;
		}

		if (focusTrack && !isTrackReference(focusTrack)) {
			const updatedFocusTrack = layoutTracks.find(
				(tr) =>
					tr.participant.identity === focusTrack.participant.identity &&
					tr.source === focusTrack.source,
			);
			if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
				layoutContext.pin.dispatch?.({
					msg: "set_pin",
					trackReference: updatedFocusTrack,
				});
			}
		}
	}, [
		screenShareTracks
			.map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
			.join(),
		focusTrack?.publication?.trackSid,
		layoutTracks,
		layoutContext.pin,
	]);

	if (!isWeb()) {
		return null;
	}

	return (
		<div
			className="lk-video-conference meeting-livekit-stage flex min-h-0 flex-1 flex-col"
			data-lk-theme="default"
		>
			<LayoutContextProvider
				value={layoutContext}
				onWidgetChange={setWidgetState}
			>
				<div className="lk-video-conference-inner min-h-0 flex-1">
					{!focusTrack ? (
						<div className="lk-grid-layout-wrapper">
							<GridLayout key={layoutKey} tracks={layoutTracks}>
								<ParticipantTile />
							</GridLayout>
						</div>
					) : (
						<div className="lk-focus-layout-wrapper">
							<FocusLayoutContainer>
								<CarouselLayout key={carouselKey} tracks={carouselTracks}>
									<ParticipantTile />
								</CarouselLayout>
								{focusTrack ? <FocusLayout trackRef={focusTrack} /> : null}
							</FocusLayoutContainer>
						</div>
					)}
					<ControlBar
						controls={{
							microphone: true,
							camera: true,
							screenShare: true,
							chat: false,
							settings: true,
							leave: true,
						}}
					/>
				</div>
				{widgetState.showSettings ? (
					<div className="lk-settings-menu-modal">
						<LiveKitSettingsMenu />
					</div>
				) : null}
			</LayoutContextProvider>
			<ConnectionStateToast />
		</div>
	);
}
