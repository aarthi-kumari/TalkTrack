"use client";

import type { LocalUserChoices } from "@livekit/components-core";
import { PreJoin } from "@livekit/components-react";
import { Video } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LiveKitPreJoinScreenProps = {
	displayName: string;
	onJoin: (choices: LocalUserChoices) => void;
};

export function LiveKitPreJoinScreen({
	displayName,
	onJoin,
}: LiveKitPreJoinScreenProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
			<Card className="w-full max-w-lg border-border/70 shadow-lg">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
						<Video className="size-6 text-primary" />
					</div>
					<CardTitle>Join with camera &amp; mic</CardTitle>
					<p className="text-sm text-muted-foreground">
						Check your devices before entering the room.
					</p>
				</CardHeader>
				<CardContent>
					<div className="lk-prejoin-theme" data-lk-theme="default">
						<PreJoin
							defaults={{
								username: displayName,
								videoEnabled: true,
								audioEnabled: true,
							}}
							joinLabel="Join meeting"
							onSubmit={onJoin}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
