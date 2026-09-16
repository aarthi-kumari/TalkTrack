import { emitNoteUpdated } from "../socket/io-instance";
import { refreshMeetingNotesFromTranscripts } from "../services/notes.service";
import type { UpdateNotesJob } from "./constants";

export async function runUpdateNotesJob(job: UpdateNotesJob): Promise<void> {
	const note = await refreshMeetingNotesFromTranscripts({
		meetingId: job.meetingId,
		roomId: job.roomId,
	});

	if (note) {
		emitNoteUpdated(job.roomId, note);
	}
}
