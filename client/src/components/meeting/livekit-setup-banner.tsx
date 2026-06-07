"use client";

import Link from "next/link";
import { ExternalLink, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LiveKitSetupBannerProps = {
	missing?: string[];
};

export function LiveKitSetupBanner({ missing }: LiveKitSetupBannerProps) {
	return (
		<Card className="border-amber-200 bg-amber-50/90 dark:border-amber-900 dark:bg-amber-950/40">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<Video className="size-5 text-amber-700 dark:text-amber-300" />
					<CardTitle className="text-base text-amber-950 dark:text-amber-100">
						LiveKit is not configured
					</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
				<p>
					Video and audio require a LiveKit Cloud project. Chat and notes still
					work in preview mode.
				</p>
				{missing?.length ? (
					<p className="font-mono text-xs">
						Missing in <code>server/.env</code>: {missing.join(", ")}
					</p>
				) : null}
				<ol className="list-decimal space-y-1 pl-5 text-amber-800 dark:text-amber-200">
					<li>
						Create a free project at{" "}
						<Link
							href="https://cloud.livekit.io"
							target="_blank"
							className="inline-flex items-center gap-1 underline"
						>
							cloud.livekit.io
							<ExternalLink className="size-3" />
						</Link>
					</li>
					<li>
						Copy API Key, API Secret, and WebSocket URL into{" "}
						<code>server/.env</code>
					</li>
					<li>
						Set <code>NEXT_PUBLIC_LIVEKIT_URL</code> in{" "}
						<code>client/.env.local</code> (same WebSocket URL)
					</li>
					<li>Restart <code>npm run dev</code> from the project root</li>
				</ol>
				<Button asChild variant="outline" size="sm" className="mt-2">
					<Link
						href="https://docs.livekit.io/home/get-started/"
						target="_blank"
					>
						LiveKit setup docs
						<ExternalLink className="size-3" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
