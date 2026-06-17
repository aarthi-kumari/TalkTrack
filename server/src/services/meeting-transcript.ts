import { prisma } from "../lib/prisma";

const DEFAULT_HISTORY_LIMIT = 100;

export type TranscriptChunkDto = {
	id?: string;
	meetingId: string;
	speaker: string;
	speakerId: string;
	text: string;
	isFinal: boolean;
	timestamp: string;
};

export async function createTranscriptEntry(params: {
	meetingId: string;
	speaker: string;
	text: string;
	timestamp?: Date;
}): Promise<TranscriptChunkDto> {
	const row = await prisma.transcript.create({
		data: {
			meetingId: params.meetingId,
			speaker: params.speaker,
			text: params.text.trim(),
			timestamp: params.timestamp ?? new Date(),
		},
	});

	return {
		id: row.id,
		meetingId: row.meetingId,
		speaker: row.speaker,
		speakerId: "",
		text: row.text,
		isFinal: true,
		timestamp: row.timestamp.toISOString(),
	};
}

export async function getMeetingTranscriptHistory(
	meetingId: string,
	limit = DEFAULT_HISTORY_LIMIT,
): Promise<TranscriptChunkDto[]> {
	const rows = await prisma.transcript.findMany({
		where: { meetingId },
		orderBy: { timestamp: "asc" },
		take: limit,
	});

	return rows.map((row) => ({
		id: row.id,
		meetingId: row.meetingId,
		speaker: row.speaker,
		speakerId: "",
		text: row.text,
		isFinal: true,
		timestamp: row.timestamp.toISOString(),
	}));
}
