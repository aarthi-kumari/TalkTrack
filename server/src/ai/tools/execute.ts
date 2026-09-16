import { consumeRateLimit } from "../../lib/rate-limit";
import { isAssistantToolName, type AssistantToolName } from "./registry";
import { searchWeb } from "./search-web";
import { sendMeetingSummary } from "./send-summary";
import type { ChatMessageDto } from "../../services/meeting-chat";

export type ToolExecutionContext = {
	meetingId: string;
	roomId: string;
	userId: string;
	isHost: boolean;
	onChatMessage?: (message: ChatMessageDto) => void;
};

export type ToolExecutionResult = {
	name: AssistantToolName;
	output: string;
};

const TOOL_RATE_LIMIT = 8;
const TOOL_WINDOW_MS = 5 * 60 * 1000;

export async function executeAssistantTool(
	name: string,
	args: Record<string, unknown>,
	ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
	if (!isAssistantToolName(name)) {
		return { name: "search_web", output: `Unknown tool: ${name}` };
	}

	const rate = await consumeRateLimit({
		key: `ai-tool:${ctx.meetingId}:${ctx.userId}`,
		limit: TOOL_RATE_LIMIT,
		windowMs: TOOL_WINDOW_MS,
	});

	if (!rate.allowed) {
		return {
			name,
			output: "Tool rate limit reached for this meeting. Try again in a few minutes.",
		};
	}

	switch (name) {
		case "search_web": {
			const query = typeof args.query === "string" ? args.query : "";
			const output = await searchWeb(query);
			return { name, output };
		}
		case "send_summary": {
			if (!ctx.isHost) {
				return {
					name,
					output: "Only the meeting host can send the summary to everyone.",
				};
			}
			try {
				const { message, preview } = await sendMeetingSummary({
					meetingId: ctx.meetingId,
					roomId: ctx.roomId,
					senderId: ctx.userId,
				});
				ctx.onChatMessage?.(message);
				return {
					name,
					output: `Summary posted to meeting chat:\n${preview}`,
				};
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to send summary";
				return { name, output: message };
			}
		}
		default: {
			const exhaustive: never = name;
			return { name: "search_web", output: `Unhandled tool: ${exhaustive}` };
		}
	}
}
