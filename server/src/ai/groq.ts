import Groq from "groq-sdk";
import type {
	ChatCompletionMessageParam,
	ChatCompletionTool,
} from "groq-sdk/resources/chat/completions";

import { getGroqConfigStatus } from "../lib/ai-config";
import { parseJsonObject } from "../lib/json";
import { ASSISTANT_TOOL_DEFINITIONS, type AssistantToolName } from "./tools/registry";
import { buildInteractiveAssistantPrompt } from "./prompts/interactive-assistant";
import {
	buildInteractiveIntentPrompt,
	buildTranscriptClassifierPrompt,
} from "./prompts/passive-notes";

const CLASSIFIER_MODEL = "llama-3.1-8b-instant";
const ASSISTANT_MODEL = "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS = 3;

let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
	const { configured } = getGroqConfigStatus();
	if (!configured) return null;

	if (!groqClient) {
		groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY! });
	}

	return groqClient;
}

function requireGroqClient(): Groq {
	const client = getGroqClient();
	if (!client) {
		throw new Error(
			"AI assistant is not configured. Add GROQ_API_KEY to server/.env and restart.",
		);
	}
	return client;
}

export type TranscriptClassification = {
	relevant: boolean;
	reason: string;
};

function parseClassification(raw: string): TranscriptClassification {
	const parsed = parseJsonObject<TranscriptClassification>(raw);
	return {
		relevant: Boolean(parsed.relevant),
		reason: typeof parsed.reason === "string" ? parsed.reason : "",
	};
}

export async function classifyTranscriptChunk(params: {
	speaker: string;
	text: string;
}): Promise<TranscriptClassification> {
	const trimmed = params.text.trim();
	if (trimmed.length < 8) {
		return { relevant: false, reason: "too-short" };
	}

	const client = getGroqClient();
	if (!client) {
		return { relevant: trimmed.length >= 12, reason: "groq-unconfigured" };
	}

	const completion = await client.chat.completions.create({
		model: CLASSIFIER_MODEL,
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

export async function classifyInteractiveIntent(text: string): Promise<boolean> {
	const client = getGroqClient();
	if (!client) return false;

	const completion = await client.chat.completions.create({
		model: CLASSIFIER_MODEL,
		messages: [
			{
				role: "user",
				content: buildInteractiveIntentPrompt(text),
			},
		],
		response_format: { type: "json_object" },
		temperature: 0,
		max_tokens: 64,
	});

	const parsed = parseJsonObject<{ addressedToAi?: boolean }>(
		completion.choices[0]?.message?.content ?? "{}",
	);
	return Boolean(parsed.addressedToAi);
}

const groqTools: ChatCompletionTool[] = ASSISTANT_TOOL_DEFINITIONS.map((tool) => ({
	type: "function" as const,
	function: {
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters,
	},
}));

export type AssistantToolCallEvent = {
	name: AssistantToolName;
	args: Record<string, unknown>;
	result: string;
};

export type StreamAssistantCallbacks = {
	onToken: (token: string) => void;
	onTool?: (event: AssistantToolCallEvent) => Promise<string> | string;
};

export async function generateMeetingAssistantReply(params: {
	meetingTitle: string;
	transcriptLines: string;
	notesSummary: string;
	question: string;
}): Promise<string> {
	let output = "";
	await streamMeetingAssistantReply(params, {
		onToken: (token) => {
			output += token;
		},
	});
	return output.trim();
}

export async function streamMeetingAssistantReply(
	params: {
		meetingTitle: string;
		transcriptLines: string;
		notesSummary: string;
		question: string;
		enableTools?: boolean;
	},
	callbacks: StreamAssistantCallbacks,
): Promise<string> {
	const client = requireGroqClient();
	const messages: ChatCompletionMessageParam[] = [
		{
			role: "user",
			content: buildInteractiveAssistantPrompt(params),
		},
	];

	const useTools = params.enableTools !== false && Boolean(callbacks.onTool);
	let fullText = "";

	for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
		const stream = await client.chat.completions.create({
			model: ASSISTANT_MODEL,
			messages,
			temperature: 0.4,
			max_tokens: 1024,
			stream: true,
			...(useTools ? { tools: groqTools, tool_choice: "auto" } : {}),
		});

		const toolBuffers = new Map<
			number,
			{ id: string; name: string; args: string }
		>();
		let roundText = "";

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta;
			if (!delta) continue;

			if (delta.content) {
				roundText += delta.content;
				fullText += delta.content;
				callbacks.onToken(delta.content);
			}

			for (const toolCall of delta.tool_calls ?? []) {
				const index = toolCall.index ?? 0;
				const current = toolBuffers.get(index) ?? {
					id: "",
					name: "",
					args: "",
				};
				if (toolCall.id) current.id = toolCall.id;
				if (toolCall.function?.name) current.name += toolCall.function.name;
				if (toolCall.function?.arguments) {
					current.args += toolCall.function.arguments;
				}
				toolBuffers.set(index, current);
			}
		}

		if (toolBuffers.size === 0 || !callbacks.onTool) {
			if (!fullText.trim()) {
				throw new Error("AI assistant returned an empty response");
			}
			return fullText.trim();
		}

		messages.push({
			role: "assistant",
			content: roundText || null,
			tool_calls: [...toolBuffers.entries()].map(([index, call]) => ({
				id: call.id || `tool-${index}`,
				type: "function" as const,
				function: {
					name: call.name,
					arguments: call.args || "{}",
				},
			})),
		});

		for (const call of toolBuffers.values()) {
			let args: Record<string, unknown> = {};
			try {
				args = JSON.parse(call.args || "{}") as Record<string, unknown>;
			} catch {
				args = {};
			}

			const name = call.name as AssistantToolName;
			const result = await callbacks.onTool({
				name,
				args,
				result: "",
			});

			messages.push({
				role: "tool",
				tool_call_id: call.id || call.name,
				content: result,
			});
		}

		fullText = "";
	}

	if (!fullText.trim()) {
		throw new Error("AI assistant returned an empty response");
	}
	return fullText.trim();
}
