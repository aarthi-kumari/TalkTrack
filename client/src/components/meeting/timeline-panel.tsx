import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { mockTimelineEvents } from "@/lib/mock/timeline";

export function TimelinePanel() {
	return (
		<Card className="flex min-h-0 flex-1 flex-col rounded-3xl border-border/70 bg-card/95 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
			<CardHeader className="border-b border-border/60 pb-4">
				<div className="flex items-center justify-between gap-3">
					<CardTitle>Timeline</CardTitle>
					<Badge variant="outline" className="rounded-full px-2.5">
						Live
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="min-h-0 flex-1 p-0">
				<ScrollArea className="h-full max-h-[320px] px-4 py-4 lg:max-h-[360px]">
					<ul className="flex flex-col gap-3">
						{mockTimelineEvents.map((event) => (
							<li
								key={event.id}
								className={cn(
									"rounded-2xl border px-3 py-3 text-sm transition-colors",
									event.highlighted
										? "border-primary/20 bg-primary/8 text-foreground shadow-sm"
										: "border-border/60 bg-muted/30 text-foreground/80",
								)}
							>
								<div className="flex items-center justify-between gap-3">
									<span className="text-xs text-muted-foreground">{event.time}</span>
									{event.highlighted ? (
										<Badge className="rounded-full px-2 py-0.5 text-[10px]">Now</Badge>
									) : null}
								</div>
								<p className="mt-1 font-medium">{event.title}</p>
							</li>
						))}
					</ul>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
