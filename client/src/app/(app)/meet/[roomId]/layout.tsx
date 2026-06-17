export default function MeetLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,249,252,1))]">
			{children}
		</div>
	);
}
