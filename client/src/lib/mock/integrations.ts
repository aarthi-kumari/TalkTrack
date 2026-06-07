export type MockIntegration = {
	id: string;
	name: string;
	description: string;
	connected: boolean;
};

export const mockIntegrations: MockIntegration[] = [
	{
		id: "google-calendar",
		name: "Google Calendar",
		description: "Schedule follow-ups and sync meeting events",
		connected: true,
	},
	{
		id: "slack",
		name: "Slack",
		description: "Post summaries and action items to channels",
		connected: false,
	},
	{
		id: "notion",
		name: "Notion",
		description: "Export notes and transcripts to workspaces",
		connected: false,
	},
	{
		id: "linear",
		name: "Linear",
		description: "Create issues from action items automatically",
		connected: false,
	},
];
