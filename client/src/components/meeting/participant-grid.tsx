"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ParticipantInfo = {
	id: string;
	name: string;
};

type ParticipantGridProps = {
	participants: ParticipantInfo[];
	className?: string;
};

function initials(name: string) {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export function ParticipantGrid({ participants, className }: ParticipantGridProps) {
	if (participants.length === 0) return null;

	const cols =
		participants.length === 1
			? "grid-cols-1"
			: participants.length === 2
				? "grid-cols-2"
				: "grid-cols-2 lg:grid-cols-3";

	return (
		<div
			className={cn(
				"grid min-h-[520px] flex-1 gap-4 rounded-3xl border border-border/70 bg-card/95 p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] lg:min-h-[640px] lg:p-5",
				cols,
				className,
			)}
		>
			{participants.map((participant) => (
				<Card
					key={participant.id}
					className="relative flex min-h-[180px] items-center justify-center overflow-hidden border-border/60 bg-gradient-to-br from-muted/80 to-background p-6"
				>
					<div className="flex flex-col items-center gap-3 text-center">
						<Avatar className="size-20 border border-border/60 text-lg">
							<AvatarFallback>{initials(participant.name)}</AvatarFallback>
						</Avatar>
						<div>
							<p className="font-semibold">{participant.name}</p>
							<p className="text-xs text-muted-foreground">In meeting</p>
						</div>
					</div>
				</Card>
			))}
		</div>
	);
}
