import { prisma } from "../lib/prisma";
import {
	refreshMeetingNotesFromTranscripts,
	saveMeetingNoteContent,
	type MeetingAnalytics,
	type MeetingTalkTime,
} from "../services/notes.service";
import { emitNoteUpdated } from "../socket/io-instance";
import type { FinalizeMeetingJob } from "./constants";

const MAX_GAP_SECONDS = 15;

function wordCount(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function computeMeetingAnalytics(
	meetingId: string,
): Promise<MeetingAnalytics> {
	const [transcripts, messageCount, aiInvocationCount] = await Promise.all([
		prisma.transcript.findMany({
			where: { meetingId },
			orderBy: { timestamp: "asc" },
			select: { speaker: true, text: true, timestamp: true },
		}),
		prisma.message.count({ where: { meetingId } }),
		prisma.message.count({ where: { meetingId, role: "AI" } }),
	]);

	const talk = new Map<string, MeetingTalkTime>();

	for (let index = 0; index < transcripts.length; index += 1) {
		const current = transcripts[index];
		const next = transcripts[index + 1];
		const words = wordCount(current.text);
		const gapSeconds = next
			? Math.min(
					MAX_GAP_SECONDS,
					Math.max(
						0,
						(next.timestamp.getTime() - current.timestamp.getTime()) / 1000,
					),
				)
			: Math.min(MAX_GAP_SECONDS, Math.max(2, words / 2.5));

		const existing = talk.get(current.speaker) ?? {
			speaker: current.speaker,
			seconds: 0,
			wordCount: 0,
		};
		existing.seconds += gapSeconds;
		existing.wordCount += words;
		talk.set(current.speaker, existing);
	}

	return {
		talkTimeBySpeaker: [...talk.values()].sort((a, b) => b.seconds - a.seconds),
		messageCount,
		aiInvocationCount,
		transcriptCount: transcripts.length,
		generatedAt: new Date().toISOString(),
	};
}

export async function runFinalizeMeetingJob(
	job: FinalizeMeetingJob,
): Promise<void> {
	const note = await refreshMeetingNotesFromTranscripts({
		meetingId: job.meetingId,
		roomId: job.roomId,
		transcriptLimit: 200,
	});

	const analytics = await computeMeetingAnalytics(job.meetingId);
	if (!note) {
		return;
	}

	const saved = await saveMeetingNoteContent({
		meetingId: job.meetingId,
		content: {
			...note.content,
			analytics,
			updatedAt: new Date().toISOString(),
		},
	});

	emitNoteUpdated(job.roomId, saved);
}
