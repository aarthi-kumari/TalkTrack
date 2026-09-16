import { Worker } from "bullmq";

import { getBullmqConnection, isRedisConfigured } from "../lib/redis";
import {
	FINALIZE_MEETING_QUEUE,
	PROCESS_TRANSCRIPT_QUEUE,
	UPDATE_NOTES_QUEUE,
} from "./constants";
import { setFinalizeMeetingFallback } from "./finalize.queue";
import { runFinalizeMeetingJob } from "./finalize-meeting.job";
import { setNotesUpdateFallback } from "./notes.queue";
import { runProcessTranscriptJob } from "./process-transcript.job";
import { setTranscriptFallback } from "./transcript.queue";
import { runUpdateNotesJob } from "./update-notes.job";

const workers: Worker[] = [];

export function startAiWorkers() {
	setTranscriptFallback(runProcessTranscriptJob);
	setNotesUpdateFallback(runUpdateNotesJob);
	setFinalizeMeetingFallback(runFinalizeMeetingJob);

	if (!isRedisConfigured()) {
		console.log("REDIS_URL not set — AI jobs will run in-process");
		return;
	}

	const connection = getBullmqConnection();

	workers.push(
		new Worker(
			PROCESS_TRANSCRIPT_QUEUE,
			async (job) => runProcessTranscriptJob(job.data),
			{ connection },
		),
		new Worker(
			UPDATE_NOTES_QUEUE,
			async (job) => runUpdateNotesJob(job.data),
			{ connection },
		),
		new Worker(
			FINALIZE_MEETING_QUEUE,
			async (job) => runFinalizeMeetingJob(job.data),
			{ connection },
		),
	);

	for (const worker of workers) {
		worker.on("failed", (job, error) => {
			console.warn(`Queue job failed (${worker.name}/${job?.id}):`, error);
		});
	}

	console.log("BullMQ workers started (transcript, notes, finalize)");
}
