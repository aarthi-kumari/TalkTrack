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
		<p className={cn("font-mono text-xs text-muted-foreground", className)}>
			Room ID:{" "}
			<span className="select-all break-all text-foreground">{roomId}</span>
		</p>
	);
}
