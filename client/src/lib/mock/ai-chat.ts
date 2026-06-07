export type MockAiMessage = {
	id: string;
	role: "user" | "ai";
	content: string;
	time?: string;
};

export const mockAiMessages: MockAiMessage[] = [
	{
		id: "1",
		role: "user",
		content: "@AI summarize this meeting",
		time: "10:20",
	},
	{
		id: "2",
		role: "ai",
		content:
			"**Summary:** The team aligned on Q1 priorities and agreed to ship the MVP by month-end.\n\n• Rahul owns API integration timeline\n• Design review next Tuesday\n• AI assistant features prioritized for Q2",
		time: "10:20",
	},
];

export const mockAiSuggestions = [
	"Create Action Items",
	"Generate Summary",
	"Schedule Follow-up",
];
