import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockNotePreviews } from "@/lib/mock/notes";

export default function NotesPage() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Notes"
				description="AI-generated meeting notes and summaries"
			/>

			<ScrollArea className="h-[calc(100svh-12rem)]">
				<div className="flex flex-col gap-4 pr-4">
					{mockNotePreviews.map((note) => (
						<Card key={note.id}>
							<CardHeader>
								<CardTitle className="text-base">{note.meetingTitle}</CardTitle>
								<p className="text-sm text-muted-foreground">{note.date}</p>
							</CardHeader>
							<CardContent>
								<p className="text-sm leading-relaxed text-muted-foreground">
									{note.excerpt}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}
