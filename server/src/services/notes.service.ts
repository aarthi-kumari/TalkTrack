import { Prisma } from "../generated/prisma/client";

import { generatePassiveMeetingNotes, emptyMeetingNoteContent } from "../ai/gemini";
import { prisma } from "../lib/prisma";

export type MeetingNoteActionItem = {
	text: string;
	assignee?: string;
	due?: string;
};

export type MeetingNoteContent = {
	summary: string;
	keyPoints: string[];
	decisions: string[];
	actionItems: MeetingNoteActionItem[];
	manualNotes: string[];
	updatedAt: string;
};

export type MeetingNoteDto = {
	id: string;
	meetingId: string;
	content: MeetingNoteContent;
	createdAt: string;
	updatedAt: string;
};

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
		actionItems: Array.isArray(record.actionItems)
			? record.actionItems
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
					}))
			: [],
		manualNotes: Array.isArray(record.manualNotes)
			? record.manualNotes.filter((item): item is string => typeof item === "string")
			: [],
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

export async function refreshMeetingNotesFromTranscripts(params: {
	meetingId: string;
	roomId: string;
}): Promise<MeetingNoteDto | null> {
	const meeting = await prisma.meeting.findUnique({
		where: { id: params.meetingId },
		select: {
			id: true,
			title: true,
			transcripts: {
				orderBy: { timestamp: "asc" },
				take: 80,
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

	const saved = existing
		? await prisma.note.update({
				where: { id: existing.id },
				data: { content: content as Prisma.InputJsonValue },
			})
		: await prisma.note.create({
				data: {
					meetingId: meeting.id,
					content: content as Prisma.InputJsonValue,
				},
			});

	return toDto(saved);
}
