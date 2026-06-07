import { AccessToken } from "livekit-server-sdk";
import { Router, type Request, type Response } from "express";

import { getLiveKitConfigStatus, requireLiveKitConfig } from "../lib/livekit-config";
import { attachPrismaUser } from "../middleware/auth";
import { requireApiAuth } from "../middleware/require-api-auth";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/status", (_req: Request, res: Response) => {
	const status = getLiveKitConfigStatus();
	res.json(status);
});

router.use(requireApiAuth, attachPrismaUser);

router.post("/token", async (req: Request, res: Response) => {
	try {
		const { roomId } = req.body as { roomId?: string };

		if (!roomId?.trim()) {
			return res.status(400).json({ error: "roomId is required" });
		}

		const { apiKey, apiSecret, url: livekitUrl } = requireLiveKitConfig();

		const meeting = await prisma.meeting.findUnique({
			where: { roomId: roomId.trim() },
		});

		if (!meeting) {
			return res.status(404).json({ error: "Meeting not found" });
		}

		if (meeting.endedAt) {
			return res.status(400).json({ error: "Meeting has ended" });
		}

		const dbUser = req.dbUser!;

		await prisma.participant.upsert({
			where: {
				meetingId_userId: {
					meetingId: meeting.id,
					userId: dbUser.id,
				},
			},
			create: {
				meetingId: meeting.id,
				userId: dbUser.id,
			},
			update: {
				leftAt: null,
				joinedAt: new Date(),
			},
		});

		const identity = dbUser.id;
		const name = dbUser.name ?? dbUser.email;

		const token = new AccessToken(apiKey, apiSecret, {
			identity,
			name,
			ttl: "2h",
		});

		token.addGrant({
			roomJoin: true,
			room: meeting.roomId,
			canPublish: true,
			canSubscribe: true,
			canPublishData: true,
		});

		const jwt = await token.toJwt();

		return res.json({
			token: jwt,
			url: livekitUrl,
			roomName: meeting.roomId,
		});
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("LiveKit is not configured")
		) {
			const status = getLiveKitConfigStatus();
			return res.status(503).json({
				error: error.message,
				missing: status.missing,
			});
		}
		console.error("LiveKit token error:", error);
		return res.status(500).json({ error: "Failed to create LiveKit token" });
	}
});

export default router;
