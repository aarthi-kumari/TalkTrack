import type { MessageRole } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

const DEFAULT_HISTORY_LIMIT = 50;

export type ChatMessageDto = {
	id: string;
	meetingId: string;
	senderId: string;
	userId: string | null;
	role: MessageRole;
	content: string;
	createdAt: string;
	sender: {
		id: string;
		name: string | null;
		email: string;
	};
};

export async function getMeetingByRoomId(roomId: string) {
	return prisma.meeting.findUnique({
		where: { roomId },
	});
}

export async function upsertMeetingParticipant(meetingId: string, userId: string) {
	return prisma.participant.upsert({
		where: {
			meetingId_userId: { meetingId, userId },
		},
		create: { meetingId, userId },
		update: { leftAt: null, joinedAt: new Date() },
	});
}

export async function markParticipantLeft(meetingId: string, userId: string) {
	await prisma.participant.updateMany({
		where: { meetingId, userId, leftAt: null },
		data: { leftAt: new Date() },
	});
}

export async function createMeetingMessage(params: {
	meetingId: string;
	senderId: string;
	userId: string;
	content: string;
	role?: MessageRole;
}): Promise<ChatMessageDto> {
	const message = await prisma.message.create({
		data: {
			meetingId: params.meetingId,
			senderId: params.senderId,
			userId: params.userId,
			role: params.role ?? "USER",
			content: params.content.trim(),
		},
		include: {
			user: {
				select: { id: true, name: true, email: true },
			},
		},
	});

	return toChatMessageDto(message);
}

export async function getMeetingMessageHistory(
	meetingId: string,
	limit = DEFAULT_HISTORY_LIMIT,
	cursor?: string,
): Promise<{ messages: ChatMessageDto[]; nextCursor: string | null }> {
	const messages = await prisma.message.findMany({
		where: { meetingId },
		orderBy: { createdAt: "desc" },
		take: limit + 1,
		...(cursor
			? {
					cursor: { id: cursor },
					skip: 1,
				}
			: {}),
		include: {
			user: {
				select: { id: true, name: true, email: true },
			},
		},
	});

	const hasMore = messages.length > limit;
	const slice = hasMore ? messages.slice(0, limit) : messages;

	return {
		messages: slice.reverse().map(toChatMessageDto),
		nextCursor: hasMore ? slice[0]?.id ?? null : null,
	};
}

function toChatMessageDto(message: {
	id: string;
	meetingId: string;
	senderId: string;
	userId: string | null;
	role: MessageRole;
	content: string;
	createdAt: Date;
	user: { id: string; name: string | null; email: string } | null;
}): ChatMessageDto {
	const sender = message.user ?? {
		id: message.senderId,
		name: null,
		email: "unknown",
	};

	return {
		id: message.id,
		meetingId: message.meetingId,
		senderId: message.senderId,
		userId: message.userId,
		role: message.role,
		content: message.content,
		createdAt: message.createdAt.toISOString(),
		sender,
	};
}
