"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockActionItems, type MockActionItem } from "@/lib/mock/action-items";
import { cn } from "@/lib/utils";

const priorityVariant = {
	high: "destructive",
	medium: "secondary",
	low: "outline",
} as const;

export default function ActionItemsPage() {
	const [items, setItems] = useState(mockActionItems);

	function toggle(id: string) {
		setItems((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, done: !item.done } : item,
			),
		);
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Action Items"
				description="Tasks extracted from your meetings"
			/>

			<div className="flex flex-col gap-3">
				{items.map((item: MockActionItem) => (
					<Card key={item.id}>
						<CardContent className="flex items-start gap-3 py-4">
							<input
								type="checkbox"
								checked={item.done ?? false}
								onChange={() => toggle(item.id)}
								className="mt-1 size-4 rounded border-input"
							/>
							<div className="flex flex-1 flex-col gap-1">
								<p
									className={cn(
										"font-medium",
										item.done && "text-muted-foreground line-through",
									)}
								>
									{item.title}
								</p>
								<p className="text-sm text-muted-foreground">
									{item.assignee} · Due {item.due}
								</p>
							</div>
							<Badge variant={priorityVariant[item.priority]}>
								{item.priority}
							</Badge>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
