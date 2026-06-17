import { generateMeetingAssistantReply } from "../ai/groq";
import { prisma } from "../lib/prisma";
import { getMeetingNoteByRoomId } from "./notes.service";

export async function answerMeetingAssistantQuestion(params: {
	roomId: string;
	question: string;
}): Promise<string> {
	const meeting = await prisma.meeting.findUnique({
		where: { roomId: params.roomId },
		select: {
			id: true,
			title: true,
			transcripts: {
				orderBy: { timestamp: "desc" },
				take: 40,
				select: { speaker: true, text: true, timestamp: true },
			},
		},
	});

	if (!meeting) {
		throw new Error("Meeting not found");
	}

	const transcripts = [...meeting.transcripts].reverse();
	const transcriptLines = transcripts
		.map((line) => `${line.speaker}: ${line.text}`)
		.join("\n");

	const note = await getMeetingNoteByRoomId(params.roomId);
	const notesSummary = note?.content.summary?.trim()
		? note.content.summary
		: [
				...(note?.content.keyPoints ?? []),
				...(note?.content.decisions ?? []),
				...(note?.content.manualNotes ?? []),
			]
				.filter(Boolean)
				.join("\n");

	return generateMeetingAssistantReply({
		meetingTitle: meeting.title,
		transcriptLines,
		notesSummary,
		question: params.question,
	});
}
