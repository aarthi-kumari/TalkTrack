"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { mockIntegrations } from "@/lib/mock/integrations";

export default function IntegrationsPage() {
	const [integrations, setIntegrations] = useState(mockIntegrations);

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Integrations"
				description="Connect tools to extend Meeting AI"
			/>

			<div className="grid gap-4 sm:grid-cols-2">
				{integrations.map((item) => (
					<Card key={item.id}>
						<CardHeader className="flex flex-row items-start justify-between gap-4">
							<div>
								<CardTitle className="text-base">{item.name}</CardTitle>
								<CardDescription>{item.description}</CardDescription>
							</div>
							<Badge variant={item.connected ? "default" : "secondary"}>
								{item.connected ? "Connected" : "Available"}
							</Badge>
						</CardHeader>
						<CardContent className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Enable</span>
							<Switch
								checked={item.connected}
								onCheckedChange={(checked) =>
									setIntegrations((prev) =>
										prev.map((i) =>
											i.id === item.id ? { ...i, connected: checked } : i,
										),
									)
								}
							/>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
