import { Router, type Request, type Response } from "express";
import crypto from "crypto";

import { attachPrismaUser } from "../middleware/auth";
import { requireApiAuth } from "../middleware/require-api-auth";
import { prisma } from "../lib/prisma";
import { getMeetingMessageHistory } from "../services/meeting-chat";

const router = Router();

router.use(requireApiAuth, attachPrismaUser);

router.get("/room/:roomId", async (req: Request, res: Response) => {
	try {
		const roomId = String(req.params.roomId);

		const meeting = await prisma.meeting.findUnique({
			where: { roomId },
			include: {
				host: {
					select: { id: true, name: true, email: true },
				},
			},
		});

		if (!meeting) {
			return res.status(404).json({ error: "Meeting not found" });
		}

		res.json(meeting);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch meeting" });
	}
});

router.get("/room/:roomId/messages", async (req: Request, res: Response) => {
	try {
		const roomId = String(req.params.roomId);
		const cursor =
			typeof req.query.cursor === "string" ? req.query.cursor : undefined;
		const limit = Math.min(Number(req.query.limit) || 50, 100);

		const meeting = await prisma.meeting.findUnique({
			where: { roomId },
		});

		if (!meeting) {
			return res.status(404).json({ error: "Meeting not found" });
		}

		const { messages, nextCursor } = await getMeetingMessageHistory(
			meeting.id,
			limit,
			cursor,
		);

		res.json({ messages, nextCursor });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch messages" });
	}
});

router.patch("/:id/end", async (req: Request, res: Response) => {
	try {
		const id = String(req.params.id);
		const userId = req.dbUser!.id;

		const meeting = await prisma.meeting.findUnique({ where: { id } });

		if (!meeting) {
			return res.status(404).json({ error: "Meeting not found" });
		}

		if (meeting.hostId !== userId) {
			return res.status(403).json({ error: "Only the host can end this meeting" });
		}

		if (meeting.endedAt) {
			return res.json(meeting);
		}

		const updated = await prisma.meeting.update({
			where: { id },
			data: { endedAt: new Date() },
		});

		res.json(updated);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to end meeting" });
	}
});

router.post("/", async (req: Request, res: Response) => {
	try {
		const { title } = req.body as { title?: string };

		if (!title?.trim()) {
			return res.status(400).json({ error: "title is required" });
		}

		const meeting = await prisma.meeting.create({
			data: {
				title: title.trim(),
				hostId: req.dbUser!.id,
				roomId: crypto.randomUUID(),
			},
		});

		res.status(201).json(meeting);
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: "Failed to create meeting",
		});
	}
});

router.get("/", async (req: Request, res: Response) => {
	try {
		const userId = req.dbUser!.id;

		const meetings = await prisma.meeting.findMany({
			where: {
				OR: [
					{ hostId: userId },
					{ participants: { some: { userId } } },
				],
			},
			orderBy: {
				startedAt: "desc",
			},
			include: {
				host: {
					select: { id: true, name: true, email: true },
				},
			},
		});

		res.json(meetings);
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: "Failed to fetch meetings",
		});
	}
});

export default router;
