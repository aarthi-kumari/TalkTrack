import { Prisma } from "../generated/prisma/client";

import { generatePassiveMeetingNotes, emptyMeetingNoteContent } from "../ai/gemini";
import { prisma } from "../lib/prisma";

export type MeetingNoteActionItem = {
	text: string;
	assignee?: string;
	due?: string;
};

export type MeetingTalkTime = {
	speaker: string;
	seconds: number;
	wordCount: number;
};

export type MeetingAnalytics = {
	talkTimeBySpeaker: MeetingTalkTime[];
	messageCount: number;
	aiInvocationCount: number;
	transcriptCount: number;
	generatedAt: string;
};

export type MeetingNoteContent = {
	summary: string;
	keyPoints: string[];
	decisions: string[];
	actionItems: MeetingNoteActionItem[];
	manualNotes: string[];
	analytics?: MeetingAnalytics;
	updatedAt: string;
};

export type MeetingNoteDto = {
	id: string;
	meetingId: string;
	content: MeetingNoteContent;
	createdAt: string;
	updatedAt: string;
};

export type MeetingNoteListItem = MeetingNoteDto & {
	meeting: {
		id: string;
		title: string;
		roomId: string;
		startedAt: string;
		endedAt: string | null;
	};
};

function toActionItems(value: unknown): MeetingNoteActionItem[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter(
			(item): item is MeetingNoteActionItem =>
				typeof item === "object" &&
				item !== null &&
				typeof (item as { text?: unknown }).text === "string",
		)
		.map((item) => ({
			text: item.text,
			assignee: typeof item.assignee === "string" ? item.assignee : undefined,
			due: typeof item.due === "string" ? item.due : undefined,
		}));
}

function toAnalytics(value: unknown): MeetingAnalytics | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	if (!Array.isArray(record.talkTimeBySpeaker)) return undefined;

	return {
		talkTimeBySpeaker: record.talkTimeBySpeaker
			.filter(
				(item): item is MeetingTalkTime =>
					typeof item === "object" &&
					item !== null &&
					typeof (item as { speaker?: unknown }).speaker === "string",
			)
			.map((item) => ({
				speaker: item.speaker,
				seconds: typeof item.seconds === "number" ? item.seconds : 0,
				wordCount: typeof item.wordCount === "number" ? item.wordCount : 0,
			})),
		messageCount: typeof record.messageCount === "number" ? record.messageCount : 0,
		aiInvocationCount:
			typeof record.aiInvocationCount === "number" ? record.aiInvocationCount : 0,
		transcriptCount:
			typeof record.transcriptCount === "number" ? record.transcriptCount : 0,
		generatedAt:
			typeof record.generatedAt === "string"
				? record.generatedAt
				: new Date().toISOString(),
	};
}

function toMeetingNoteContent(value: Prisma.JsonValue): MeetingNoteContent {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return { ...emptyMeetingNoteContent };
	}

	const record = value as Record<string, unknown>;
	return {
		summary: typeof record.summary === "string" ? record.summary : "",
		keyPoints: Array.isArray(record.keyPoints)
			? record.keyPoints.filter((item): item is string => typeof item === "string")
			: [],
		decisions: Array.isArray(record.decisions)
			? record.decisions.filter((item): item is string => typeof item === "string")
			: [],
		actionItems: toActionItems(record.actionItems),
		manualNotes: Array.isArray(record.manualNotes)
			? record.manualNotes.filter((item): item is string => typeof item === "string")
			: [],
		analytics: toAnalytics(record.analytics),
		updatedAt:
			typeof record.updatedAt === "string"
				? record.updatedAt
				: new Date().toISOString(),
	};
}

function toDto(note: {
	id: string;
	meetingId: string;
	content: Prisma.JsonValue;
	createdAt: Date;
}): MeetingNoteDto {
	const content = toMeetingNoteContent(note.content);
	return {
		id: note.id,
		meetingId: note.meetingId,
		content,
		createdAt: note.createdAt.toISOString(),
		updatedAt: content.updatedAt || note.createdAt.toISOString(),
	};
}

const userMeetingAccess = (userId: string) => ({
	OR: [{ hostId: userId }, { participants: { some: { userId } } }],
});

export async function userCanAccessMeeting(
	userId: string,
	meetingId: string,
): Promise<boolean> {
	const meeting = await prisma.meeting.findFirst({
		where: { id: meetingId, ...userMeetingAccess(userId) },
		select: { id: true },
	});
	return Boolean(meeting);
}

export async function getMeetingNoteByRoomId(roomId: string): Promise<MeetingNoteDto | null> {
	const meeting = await prisma.meeting.findUnique({
		where: { roomId },
		select: { id: true },
	});

	if (!meeting) return null;

	const note = await prisma.note.findFirst({
		where: { meetingId: meeting.id },
		orderBy: { createdAt: "desc" },
	});

	return note ? toDto(note) : null;
}

export async function getMeetingNoteByMeetingId(
	meetingId: string,
): Promise<MeetingNoteDto | null> {
	const note = await prisma.note.findFirst({
		where: { meetingId },
		orderBy: { createdAt: "desc" },
	});
	return note ? toDto(note) : null;
}

export async function listNotesForUser(userId: string): Promise<MeetingNoteListItem[]> {
	const notes = await prisma.note.findMany({
		where: {
			meeting: userMeetingAccess(userId),
		},
		include: {
			meeting: {
				select: {
					id: true,
					title: true,
					roomId: true,
					startedAt: true,
					endedAt: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return notes.map((note) => ({
		...toDto(note),
		meeting: {
			id: note.meeting.id,
			title: note.meeting.title,
			roomId: note.meeting.roomId,
			startedAt: note.meeting.startedAt.toISOString(),
			endedAt: note.meeting.endedAt?.toISOString() ?? null,
		},
	}));
}

export async function listActionItemsForUser(userId: string): Promise<
	{
		id: string;
		meetingId: string;
		meetingTitle: string;
		text: string;
		assignee?: string;
		due?: string;
	}[]
> {
	const notes = await listNotesForUser(userId);
	return notes.flatMap((note) =>
		note.content.actionItems.map((item, index) => ({
			id: `${note.meetingId}:${index}`,
			meetingId: note.meetingId,
			meetingTitle: note.meeting.title,
			text: item.text,
			assignee: item.assignee,
			due: item.due,
		})),
	);
}

export async function upsertManualNoteForRoomId(params: {
	roomId: string;
	text: string;
}): Promise<MeetingNoteDto | null> {
	const meeting = await prisma.meeting.findUnique({
		where: { roomId: params.roomId },
		select: { id: true },
	});

	if (!meeting) return null;

	const existing = await prisma.note.findFirst({
		where: { meetingId: meeting.id },
		orderBy: { createdAt: "desc" },
	});

	const currentContent = existing
		? toMeetingNoteContent(existing.content)
		: { ...emptyMeetingNoteContent };

	const nextContent: MeetingNoteContent = {
		...currentContent,
		manualNotes: [...currentContent.manualNotes, params.text.trim()],
		updatedAt: new Date().toISOString(),
	};

	const saved = existing
		? await prisma.note.update({
				where: { id: existing.id },
				data: { content: nextContent as Prisma.InputJsonValue },
			})
		: await prisma.note.create({
				data: {
					meetingId: meeting.id,
					content: nextContent as Prisma.InputJsonValue,
				},
			});

	return toDto(saved);
}

export async function saveMeetingNoteContent(params: {
	meetingId: string;
	content: MeetingNoteContent;
}): Promise<MeetingNoteDto> {
	const existing = await prisma.note.findFirst({
		where: { meetingId: params.meetingId },
		orderBy: { createdAt: "desc" },
	});

	const saved = existing
		? await prisma.note.update({
				where: { id: existing.id },
				data: { content: params.content as Prisma.InputJsonValue },
			})
		: await prisma.note.create({
				data: {
					meetingId: params.meetingId,
					content: params.content as Prisma.InputJsonValue,
				},
			});

	return toDto(saved);
}

export async function refreshMeetingNotesFromTranscripts(params: {
	meetingId: string;
	roomId: string;
	transcriptLimit?: number;
}): Promise<MeetingNoteDto | null> {
	const meeting = await prisma.meeting.findUnique({
		where: { id: params.meetingId },
		select: {
			id: true,
			title: true,
			transcripts: {
				orderBy: { timestamp: "asc" },
				take: params.transcriptLimit ?? 80,
				select: { speaker: true, text: true, timestamp: true },
			},
		},
	});

	if (!meeting) return null;

	const existing = await prisma.note.findFirst({
		where: { meetingId: meeting.id },
		orderBy: { createdAt: "desc" },
	});

	const currentContent = existing
		? toMeetingNoteContent(existing.content)
		: { ...emptyMeetingNoteContent };

	const transcriptLines = meeting.transcripts
		.map((line) => `[${line.timestamp.toISOString()}] ${line.speaker}: ${line.text}`)
		.join("\n");

	if (!transcriptLines.trim()) {
		return existing ? toDto(existing) : null;
	}

	const content = await generatePassiveMeetingNotes({
		meetingTitle: meeting.title,
		transcriptLines,
		currentNotes: currentContent,
	});

	return saveMeetingNoteContent({
		meetingId: meeting.id,
		content,
	});
}

export async function getDashboardSummary(userId: string): Promise<{
	activeMeetings: number;
	openActionItems: number;
	notesCount: number;
}> {
	const [activeMeetings, notes] = await Promise.all([
		prisma.meeting.count({
			where: {
				endedAt: null,
				...userMeetingAccess(userId),
			},
		}),
		listNotesForUser(userId),
	]);

	return {
		activeMeetings,
		openActionItems: notes.reduce(
			(sum, note) => sum + note.content.actionItems.length,
			0,
		),
		notesCount: notes.filter((note) => note.content.summary.trim().length > 0).length,
	};
}
