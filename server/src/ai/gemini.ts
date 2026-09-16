import { GoogleGenerativeAI } from "@google/generative-ai";

import { getGeminiConfigStatus } from "../lib/ai-config";
import { parseJsonObject } from "../lib/json";
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

const NOTE_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;

function asStringArray(value: unknown): string[] | null {
	if (!Array.isArray(value)) return null;
	return value.filter((item): item is string => typeof item === "string");
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

	const prompt = buildPassiveNotesPrompt({
		meetingTitle: params.meetingTitle,
		transcriptLines: params.transcriptLines,
		currentNotesJson: JSON.stringify(params.currentNotes, null, 2),
	});

	let raw = "";
	let lastError: unknown;
	for (const modelName of NOTE_MODELS) {
		try {
			const model = client.getGenerativeModel({ model: modelName });
			const result = await model.generateContent(prompt);
			raw = result.response.text();
			lastError = undefined;
			break;
		} catch (error) {
			lastError = error;
		}
	}

	if (lastError && !raw) {
		console.warn("Gemini notes generation failed:", lastError);
		return params.currentNotes;
	}

	const parsed = parseJsonObject<MeetingNoteContent>(raw);

	return {
		summary:
			typeof parsed.summary === "string" ? parsed.summary : params.currentNotes.summary,
		keyPoints: asStringArray(parsed.keyPoints) ?? params.currentNotes.keyPoints,
		decisions: asStringArray(parsed.decisions) ?? params.currentNotes.decisions,
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
		analytics: params.currentNotes.analytics,
		updatedAt: new Date().toISOString(),
	};
}

export { EMPTY_CONTENT as emptyMeetingNoteContent };
