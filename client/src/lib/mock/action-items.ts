export type MockActionItem = {
	id: string;
	title: string;
	assignee: string;
	due: string;
	priority: "high" | "medium" | "low";
	done?: boolean;
};

export const mockActionItems: MockActionItem[] = [
	{
		id: "1",
		title: "Send API integration timeline to team",
		assignee: "Rahul",
		due: "Mar 5",
		priority: "high",
	},
	{
		id: "2",
		title: "Prepare design review deck",
		assignee: "Mei",
		due: "Mar 8",
		priority: "medium",
	},
	{
		id: "3",
		title: "Update product roadmap doc",
		assignee: "Jason",
		due: "Mar 10",
		priority: "low",
		done: true,
	},
];
