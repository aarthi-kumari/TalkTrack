import { Queue } from "bullmq";

import { getBullmqConnection, isRedisConfigured } from "../lib/redis";
import {
	PROCESS_TRANSCRIPT_JOB,
	PROCESS_TRANSCRIPT_QUEUE,
	type ProcessTranscriptJob,
} from "./constants";

let queue: Queue | null = null;
let fallbackHandler: ((job: ProcessTranscriptJob) => Promise<void>) | null =
	null;

export function setTranscriptFallback(
	handler: (job: ProcessTranscriptJob) => Promise<void>,
) {
	fallbackHandler = handler;
}

function getQueue(): Queue {
	if (!queue) {
		queue = new Queue(PROCESS_TRANSCRIPT_QUEUE, {
			connection: getBullmqConnection(),
		});
	}
	return queue;
}

export async function enqueueProcessTranscript(
	job: ProcessTranscriptJob,
): Promise<void> {
	if (isRedisConfigured()) {
		try {
			await getQueue().add(PROCESS_TRANSCRIPT_JOB, job, {
				removeOnComplete: 200,
				removeOnFail: 50,
			});
			return;
		} catch (error) {
			console.warn(
				"BullMQ transcript enqueue failed, processing inline:",
				error,
			);
		}
	}

	if (!fallbackHandler) return;
	void fallbackHandler(job).catch((error) => {
		console.warn("inline transcript processing failed:", error);
	});
}
