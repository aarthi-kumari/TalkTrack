export const PROCESS_TRANSCRIPT_QUEUE = "process-transcript";
export const UPDATE_NOTES_QUEUE = "update-notes";

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
