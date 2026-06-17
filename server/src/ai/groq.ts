import Groq from "groq-sdk";

import { getGroqConfigStatus } from "../lib/ai-config";
import { buildInteractiveAssistantPrompt } from "./prompts/interactive-assistant";
import { buildTranscriptClassifierPrompt } from "./prompts/passive-notes";

let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
	const { configured } = getGroqConfigStatus();
	if (!configured) return null;

	if (!groqClient) {
		groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY! });
	}

	return groqClient;
}

export type TranscriptClassification = {
	relevant: boolean;
	reason: string;
};

function parseClassification(raw: string): TranscriptClassification {
	try {
		const parsed = JSON.parse(raw) as Partial<TranscriptClassification>;
		return {
			relevant: Boolean(parsed.relevant),
			reason: typeof parsed.reason === "string" ? parsed.reason : "",
		};
	} catch {
		return { relevant: true, reason: "parse-fallback" };
	}
}

export async function classifyTranscriptChunk(params: {
	speaker: string;
	text: string;
}): Promise<TranscriptClassification> {
	const client = getGroqClient();
	if (!client) {
		return { relevant: params.text.trim().length >= 12, reason: "groq-unconfigured" };
	}

	const completion = await client.chat.completions.create({
		model: "llama-3.1-8b-instant",
		messages: [
			{
				role: "user",
				content: buildTranscriptClassifierPrompt(params),
			},
		],
		response_format: { type: "json_object" },
		temperature: 0,
		max_tokens: 128,
	});

	const content = completion.choices[0]?.message?.content ?? "{}";
	return parseClassification(content);
}

export async function generateMeetingAssistantReply(params: {
	meetingTitle: string;
	transcriptLines: string;
	notesSummary: string;
	question: string;
}): Promise<string> {
	const client = getGroqClient();
	if (!client) {
		throw new Error(
			"AI assistant is not configured. Add GROQ_API_KEY to server/.env and restart.",
		);
	}

	const completion = await client.chat.completions.create({
		model: "llama-3.3-70b-versatile",
		messages: [
			{
				role: "user",
				content: buildInteractiveAssistantPrompt(params),
			},
		],
		temperature: 0.4,
		max_tokens: 1024,
	});

	const content = completion.choices[0]?.message?.content?.trim();
	if (!content) {
		throw new Error("AI assistant returned an empty response");
	}

	return content;
}
