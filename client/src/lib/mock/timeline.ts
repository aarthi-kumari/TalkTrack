export type MockTimelineEvent = {
	id: string;
	time: string;
	title: string;
	highlighted?: boolean;
};

export const mockTimelineEvents: MockTimelineEvent[] = [
	{ id: "1", time: "10:02", title: "Meeting started" },
	{ id: "2", time: "10:05", title: "Aarthi joined" },
	{ id: "3", time: "10:12", title: "Product roadmap update", highlighted: true },
	{ id: "4", time: "10:18", title: "Action items discussed" },
	{ id: "5", time: "10:25", title: "Next steps agreed" },
];
