import { streamMeetingAssistantReply } from "../ai/groq";
import { executeAssistantTool } from "../ai/tools/execute";
import { prisma } from "../lib/prisma";
import { getMeetingNoteByRoomId } from "./notes.service";
import { createMeetingMessage, type ChatMessageDto } from "./meeting-chat";
import type { AiAssistantMessage } from "../socket/types";

export async function answerMeetingAssistantQuestion(params: {
	roomId: string;
	question: string;
}): Promise<string> {
	let output = "";
	await streamMeetingAssistantQuestion({
		...params,
		requestedByUserId: "",
		isHost: false,
		onToken: (token) => {
			output += token;
		},
	});
	return output;
}

export async function streamMeetingAssistantQuestion(params: {
	roomId: string;
	question: string;
	requestedByUserId: string;
	isHost: boolean;
	onToken: (token: string) => void;
	onToolCalled?: (payload: {
		name: string;
		args: Record<string, unknown>;
		result: string;
	}) => void;
	onChatMessage?: (message: ChatMessageDto) => void;
}): Promise<string> {
	const meeting = await prisma.meeting.findUnique({
		where: { roomId: params.roomId },
		select: {
			id: true,
			title: true,
			hostId: true,
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
		? [
				note.content.summary,
				...note.content.keyPoints,
				...note.content.decisions,
				...note.content.actionItems.map((item) => item.text),
			]
				.filter(Boolean)
				.join("\n")
		: [
				...(note?.content.keyPoints ?? []),
				...(note?.content.decisions ?? []),
				...(note?.content.manualNotes ?? []),
			]
				.filter(Boolean)
				.join("\n");

	return streamMeetingAssistantReply(
		{
			meetingTitle: meeting.title,
			transcriptLines,
			notesSummary,
			question: params.question,
			enableTools: Boolean(params.requestedByUserId),
		},
		{
			onToken: params.onToken,
			onTool: params.requestedByUserId
				? async ({ name, args }) => {
						const result = await executeAssistantTool(name, args, {
							meetingId: meeting.id,
							roomId: params.roomId,
							userId: params.requestedByUserId,
							isHost: params.isHost || meeting.hostId === params.requestedByUserId,
							onChatMessage: params.onChatMessage,
						});
						params.onToolCalled?.({
							name: result.name,
							args,
							result: result.output,
						});
						return result.output;
					}
				: undefined,
		},
	);
}

export async function persistAssistantExchange(params: {
	meetingId: string;
	userId: string;
	question: string;
	answer: string;
}): Promise<{ userMessage: ChatMessageDto; aiMessage: ChatMessageDto }> {
	const userMessage = await createMeetingMessage({
		meetingId: params.meetingId,
		senderId: params.userId,
		userId: params.userId,
		content: params.question,
		role: "USER",
	});

	const aiMessage = await createMeetingMessage({
		meetingId: params.meetingId,
		senderId: params.userId,
		userId: params.userId,
		content: params.answer,
		role: "AI",
	});

	return { userMessage, aiMessage };
}

export async function persistAssistantReply(params: {
	id?: string;
	meetingId: string;
	userId: string;
	answer: string;
}): Promise<ChatMessageDto> {
	return createMeetingMessage({
		id: params.id,
		meetingId: params.meetingId,
		senderId: params.userId,
		userId: params.userId,
		content: params.answer,
		role: "AI",
	});
}

export async function getAssistantHistory(
	meetingId: string,
	limit = 30,
): Promise<AiAssistantMessage[]> {
	const messages = await prisma.message.findMany({
		where: { meetingId, role: { in: ["USER", "AI"] } },
		orderBy: { createdAt: "desc" },
		take: limit,
		select: {
			id: true,
			role: true,
			content: true,
			createdAt: true,
		},
	});

	const chronological = [...messages].reverse();
	const history: AiAssistantMessage[] = [];

	for (let index = 0; index < chronological.length; index += 1) {
		const message = chronological[index];
		if (message.role === "AI") {
			const previous = chronological[index - 1];
			if (
				previous?.role === "USER" &&
				!history.some((item) => item.id === previous.id)
			) {
				history.push({
					id: previous.id,
					role: "user",
					content: previous.content,
					timestamp: previous.createdAt.toISOString(),
				});
			}
			history.push({
				id: message.id,
				role: "ai",
				content: message.content,
				timestamp: message.createdAt.toISOString(),
			});
		}
	}

	return history.slice(-20);
}
