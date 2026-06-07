export type MockRecentMeeting = {
	id: string;
	title: string;
	date: string;
	duration: string;
	roomId: string;
};

export type MockMeetingListItem = MockRecentMeeting & {
	status?: "active" | "ended";
};

export const mockRecentMeetings: MockRecentMeeting[] = [
	{
		id: "1",
		title: "Team Standup",
		date: "Today, 10:00 AM",
		duration: "25m",
		roomId: "team-standup",
	},
	{
		id: "2",
		title: "Product Roadmap",
		date: "Yesterday, 2:00 PM",
		duration: "45m",
		roomId: "product-roadmap",
	},
	{
		id: "3",
		title: "Design Review",
		date: "Mon, 11:00 AM",
		duration: "30m",
		roomId: "design-review",
	},
];

export const mockMeetingsList: MockMeetingListItem[] = [
	...mockRecentMeetings.map((m) => ({ ...m, status: "active" as const })),
	{
		id: "4",
		title: "Client Kickoff",
		date: "Feb 28, 3:00 PM",
		duration: "60m",
		roomId: "client-kickoff",
		status: "ended" as const,
	},
	{
		id: "5",
		title: "Sprint Planning",
		date: "Feb 27, 9:00 AM",
		duration: "90m",
		roomId: "sprint-planning",
		status: "ended" as const,
	},
];
