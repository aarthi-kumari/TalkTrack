import { Queue } from "bullmq";

import { getBullmqConnection, isRedisConfigured } from "../lib/redis";
import {
	NOTES_UPDATE_DEBOUNCE_MS,
	UPDATE_NOTES_JOB,
	UPDATE_NOTES_QUEUE,
	type UpdateNotesJob,
} from "./constants";

let queue: Queue | null = null;
const fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();
let fallbackHandler: ((job: UpdateNotesJob) => Promise<void>) | null = null;

export function setNotesUpdateFallback(
	handler: (job: UpdateNotesJob) => Promise<void>,
) {
	fallbackHandler = handler;
}

function getQueue(): Queue {
	if (!queue) {
		queue = new Queue(UPDATE_NOTES_QUEUE, {
			connection: getBullmqConnection(),
		});
	}
	return queue;
}

function notesJobId(meetingId: string) {
	return `update-notes:${meetingId}`;
}

async function enqueueWithRedis(job: UpdateNotesJob): Promise<void> {
	const notesQueue = getQueue();
	const jobId = notesJobId(job.meetingId);
	const existing = await notesQueue.getJob(jobId);

	if (existing) {
		const state = await existing.getState();
		if (state === "delayed" || state === "waiting") {
			await existing.changeDelay(NOTES_UPDATE_DEBOUNCE_MS);
			return;
		}
		if (state === "completed" || state === "failed") {
			await existing.remove();
		}
	}

	await notesQueue.add(UPDATE_NOTES_JOB, job, {
		jobId,
		delay: NOTES_UPDATE_DEBOUNCE_MS,
		removeOnComplete: 100,
		removeOnFail: 50,
	});
}

function enqueueInMemory(job: UpdateNotesJob) {
	const existing = fallbackTimers.get(job.meetingId);
	if (existing) clearTimeout(existing);

	const timer = setTimeout(() => {
		fallbackTimers.delete(job.meetingId);
		if (!fallbackHandler) return;
		void fallbackHandler(job).catch((error) => {
			console.warn("in-memory notes update failed:", error);
		});
	}, NOTES_UPDATE_DEBOUNCE_MS);

	fallbackTimers.set(job.meetingId, timer);
}

export async function enqueueNotesUpdate(job: UpdateNotesJob): Promise<void> {
	if (isRedisConfigured()) {
		try {
			await enqueueWithRedis(job);
			return;
		} catch (error) {
			console.warn("BullMQ notes enqueue failed, using in-memory debounce:", error);
		}
	}

	enqueueInMemory(job);
}
