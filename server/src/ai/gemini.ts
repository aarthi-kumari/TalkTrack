import { GoogleGenerativeAI } from "@google/generative-ai";

import { getGeminiConfigStatus } from "../lib/ai-config";
import { buildPassiveNotesPrompt } from "./prompts/passive-notes";
import type { MeetingNoteContent } from "../services/notes.service";

let genAi: GoogleGenerativeAI | null = null;

function getGenAi(): GoogleGenerativeAI | null {
	const { configured } = getGeminiConfigStatus();
	if (!configured) return null;

	if (!genAi) {
		genAi = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
	}

	return genAi;
}

const EMPTY_CONTENT: MeetingNoteContent = {
	summary: "",
	keyPoints: [],
	decisions: [],
	actionItems: [],
	manualNotes: [],
	updatedAt: new Date().toISOString(),
};

function parseNotesContent(raw: string): Partial<MeetingNoteContent> {
	try {
		return JSON.parse(raw) as Partial<MeetingNoteContent>;
	} catch {
		return {};
	}
}

export async function generatePassiveMeetingNotes(params: {
	meetingTitle: string;
	transcriptLines: string;
	currentNotes: MeetingNoteContent;
}): Promise<MeetingNoteContent> {
	const client = getGenAi();
	if (!client) {
		return params.currentNotes;
	}

	const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
	const prompt = buildPassiveNotesPrompt({
		meetingTitle: params.meetingTitle,
		transcriptLines: params.transcriptLines,
		currentNotesJson: JSON.stringify(params.currentNotes, null, 2),
	});

	const result = await model.generateContent(prompt);
	const text = result.response.text();
	const parsed = parseNotesContent(text);

	return {
		summary: typeof parsed.summary === "string" ? parsed.summary : params.currentNotes.summary,
		keyPoints: Array.isArray(parsed.keyPoints)
			? parsed.keyPoints.filter((item): item is string => typeof item === "string")
			: params.currentNotes.keyPoints,
		decisions: Array.isArray(parsed.decisions)
			? parsed.decisions.filter((item): item is string => typeof item === "string")
			: params.currentNotes.decisions,
		actionItems: Array.isArray(parsed.actionItems)
			? parsed.actionItems
					.filter(
						(item): item is { text: string; assignee?: string; due?: string } =>
							typeof item === "object" &&
							item !== null &&
							typeof (item as { text?: unknown }).text === "string",
					)
					.map((item) => ({
						text: item.text,
						assignee: typeof item.assignee === "string" ? item.assignee : undefined,
						due: typeof item.due === "string" ? item.due : undefined,
					}))
			: params.currentNotes.actionItems,
		manualNotes: params.currentNotes.manualNotes,
		updatedAt: new Date().toISOString(),
	};
}

export { EMPTY_CONTENT as emptyMeetingNoteContent };
