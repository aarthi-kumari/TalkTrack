import { createMeetingMessage } from "../../services/meeting-chat";
import { getMeetingNoteByRoomId } from "../../services/notes.service";
import type { ChatMessageDto } from "../../services/meeting-chat";

function formatSummary(content: {
	summary: string;
	keyPoints: string[];
	decisions: string[];
	actionItems: { text: string; assignee?: string; due?: string }[];
}): string {
	const sections = ["Meeting summary"];

	if (content.summary.trim()) {
		sections.push(content.summary.trim());
	}

	if (content.keyPoints.length > 0) {
		sections.push(
			"Key points:\n" + content.keyPoints.map((item) => `• ${item}`).join("\n"),
		);
	}

	if (content.decisions.length > 0) {
		sections.push(
			"Decisions:\n" + content.decisions.map((item) => `• ${item}`).join("\n"),
		);
	}

	if (content.actionItems.length > 0) {
		sections.push(
			"Action items:\n" +
				content.actionItems
					.map((item) => {
						const who = item.assignee ? ` (${item.assignee})` : "";
						const due = item.due ? ` due ${item.due}` : "";
						return `• ${item.text}${who}${due}`;
					})
					.join("\n"),
		);
	}

	return sections.join("\n\n");
}

export async function sendMeetingSummary(params: {
	meetingId: string;
	roomId: string;
	senderId: string;
}): Promise<{ message: ChatMessageDto; preview: string }> {
	const note = await getMeetingNoteByRoomId(params.roomId);
	if (!note?.content.summary && !note?.content.keyPoints.length) {
		throw new Error("No meeting notes are available to send yet.");
	}

	const preview = formatSummary(note.content);
	const message = await createMeetingMessage({
		meetingId: params.meetingId,
		senderId: params.senderId,
		userId: params.senderId,
		content: preview,
		role: "SYSTEM",
	});

	return { message, preview };
}
