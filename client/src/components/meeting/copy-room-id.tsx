"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyMeetingLink } from "@/lib/meeting-link";
import { cn } from "@/lib/utils";

type CopyRoomIdButtonProps = {
	roomId: string;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "icon-sm";
	className?: string;
	label?: string;
};

export function CopyRoomIdButton({
	roomId,
	variant = "outline",
	size = "sm",
	className,
	label = "Copy link",
}: CopyRoomIdButtonProps) {
	async function handleCopy() {
		const ok = await copyMeetingLink(roomId);
		if (ok) {
			toast.success("Meeting link copied");
		} else {
			toast.error("Could not copy link");
		}
	}

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			className={cn("gap-1.5", className)}
			onClick={handleCopy}
		>
			<Copy className="size-3.5" />
			{label}
		</Button>
	);
}

export function RoomIdDisplay({
	roomId,
	className,
}: {
	roomId: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"inline-flex max-w-full items-center gap-2 rounded-lg border border-border/70 bg-muted/50 px-3 py-1.5 font-mono text-xs",
				className,
			)}
		>
			<span className="shrink-0 text-muted-foreground">Room ID</span>
			<span className="select-all break-all text-foreground">{roomId}</span>
		</div>
	);
}
