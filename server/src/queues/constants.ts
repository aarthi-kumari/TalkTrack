export const PROCESS_TRANSCRIPT_QUEUE = "process-transcript";
export const UPDATE_NOTES_QUEUE = "update-notes";
export const FINALIZE_MEETING_QUEUE = "finalize-meeting";

export const PROCESS_TRANSCRIPT_JOB = "process-transcript";
export const UPDATE_NOTES_JOB = "update-notes";
export const FINALIZE_MEETING_JOB = "finalize-meeting";

export const NOTES_UPDATE_DEBOUNCE_MS = 30_000;

export type ProcessTranscriptJob = {
	meetingId: string;
	roomId: string;
	transcriptId: string;
	speaker: string;
	text: string;
};

export type UpdateNotesJob = {
	meetingId: string;
	roomId: string;
};

export type FinalizeMeetingJob = {
	meetingId: string;
	roomId: string;
};
