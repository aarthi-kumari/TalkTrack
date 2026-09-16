export const ASSISTANT_TOOL_NAMES = ["search_web", "send_summary"] as const;

export type AssistantToolName = (typeof ASSISTANT_TOOL_NAMES)[number];

export type AssistantToolDefinition = {
	name: AssistantToolName;
	description: string;
	parameters: {
		type: "object";
		properties: Record<string, { type: string; description: string }>;
		required: string[];
	};
};

export const ASSISTANT_TOOL_DEFINITIONS: AssistantToolDefinition[] = [
	{
		name: "search_web",
		description:
			"Search the public web for current facts, docs, or references the meeting needs.",
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query",
				},
			},
			required: ["query"],
		},
	},
	{
		name: "send_summary",
		description:
			"Post the current meeting notes summary into the meeting chat so everyone can see it. Host only.",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
];

export function isAssistantToolName(value: string): value is AssistantToolName {
	return (ASSISTANT_TOOL_NAMES as readonly string[]).includes(value);
}
