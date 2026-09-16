import { Queue } from "bullmq";

import { getBullmqConnection, isRedisConfigured } from "../lib/redis";
import {
	FINALIZE_MEETING_JOB,
	FINALIZE_MEETING_QUEUE,
	type FinalizeMeetingJob,
} from "./constants";

let queue: Queue | null = null;
let fallbackHandler: ((job: FinalizeMeetingJob) => Promise<void>) | null = null;

export function setFinalizeMeetingFallback(
	handler: (job: FinalizeMeetingJob) => Promise<void>,
) {
	fallbackHandler = handler;
}

function getQueue(): Queue {
	if (!queue) {
		queue = new Queue(FINALIZE_MEETING_QUEUE, {
			connection: getBullmqConnection(),
		});
	}
	return queue;
}

export async function enqueueFinalizeMeeting(
	job: FinalizeMeetingJob,
): Promise<void> {
	if (isRedisConfigured()) {
		try {
			await getQueue().add(FINALIZE_MEETING_JOB, job, {
				jobId: `finalize:${job.meetingId}`,
				removeOnComplete: 50,
				removeOnFail: 20,
			});
			return;
		} catch (error) {
			console.warn(
				"BullMQ finalize enqueue failed, running inline:",
				error,
			);
		}
	}

	if (!fallbackHandler) return;
	void fallbackHandler(job).catch((error) => {
		console.warn("inline finalize meeting failed:", error);
	});
}
