import { classifyTranscriptChunk } from "../ai/groq";
import { enqueueNotesUpdate } from "./notes.queue";
import type { ProcessTranscriptJob } from "./constants";

export async function runProcessTranscriptJob(
	job: ProcessTranscriptJob,
): Promise<void> {
	const classification = await classifyTranscriptChunk({
		speaker: job.speaker,
		text: job.text,
	});

	if (!classification.relevant) return;

	await enqueueNotesUpdate({
		meetingId: job.meetingId,
		roomId: job.roomId,
	});
}
