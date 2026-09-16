import { Router, type Request, type Response } from "express";

import { attachPrismaUser } from "../middleware/auth";
import { requireApiAuth } from "../middleware/require-api-auth";
import {
	getDashboardSummary,
	getMeetingNoteByMeetingId,
	listActionItemsForUser,
	listNotesForUser,
	userCanAccessMeeting,
} from "../services/notes.service";
import { computeMeetingAnalytics } from "../queues/finalize-meeting.job";
import { prisma } from "../lib/prisma";

const router = Router();

router.use(requireApiAuth, attachPrismaUser);

router.get("/", async (req: Request, res: Response) => {
	try {
		const notes = await listNotesForUser(req.dbUser!.id);
		res.json({ notes });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch notes" });
	}
});

router.get("/summary", async (req: Request, res: Response) => {
	try {
		const summary = await getDashboardSummary(req.dbUser!.id);
		res.json(summary);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch dashboard summary" });
	}
});

router.get("/action-items", async (req: Request, res: Response) => {
	try {
		const items = await listActionItemsForUser(req.dbUser!.id);
		res.json({ items });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch action items" });
	}
});

router.get("/:meetingId/analytics", async (req: Request, res: Response) => {
	try {
		const meetingId = String(req.params.meetingId);
		const allowed = await userCanAccessMeeting(req.dbUser!.id, meetingId);
		if (!allowed) {
			return res.status(404).json({ error: "Meeting not found" });
		}

		const note = await getMeetingNoteByMeetingId(meetingId);
		const analytics =
			note?.content.analytics ?? (await computeMeetingAnalytics(meetingId));
		res.json({ analytics });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch analytics" });
	}
});

router.get("/:meetingId", async (req: Request, res: Response) => {
	try {
		const meetingId = String(req.params.meetingId);
		const allowed = await userCanAccessMeeting(req.dbUser!.id, meetingId);
		if (!allowed) {
			return res.status(404).json({ error: "Meeting not found" });
		}

		const meeting = await prisma.meeting.findUnique({
			where: { id: meetingId },
			select: {
				id: true,
				title: true,
				roomId: true,
				hostId: true,
				startedAt: true,
				endedAt: true,
			},
		});

		if (!meeting) {
			return res.status(404).json({ error: "Meeting not found" });
		}

		const note = await getMeetingNoteByMeetingId(meetingId);
		res.json({
			meeting: {
				...meeting,
				startedAt: meeting.startedAt.toISOString(),
				endedAt: meeting.endedAt?.toISOString() ?? null,
			},
			note,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to fetch notes" });
	}
});

export default router;