"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserStore } from "@/stores/user-store";

export default function SettingsPage() {
	const { dbUser } = useUserStore();

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader title="Settings" description="Manage your account and preferences" />

			<Tabs defaultValue="profile">
				<TabsList>
					<TabsTrigger value="profile">Profile</TabsTrigger>
					<TabsTrigger value="notifications">Notifications</TabsTrigger>
					<TabsTrigger value="ai">AI</TabsTrigger>
				</TabsList>

				<TabsContent value="profile" className="mt-6 flex flex-col gap-4">
					<div className="rounded-lg border border-border p-4">
						<p className="text-sm text-muted-foreground">Name</p>
						<p className="font-medium">{dbUser?.name ?? "—"}</p>
					</div>
					<div className="rounded-lg border border-border p-4">
						<p className="text-sm text-muted-foreground">Email</p>
						<p className="font-medium">{dbUser?.email ?? "—"}</p>
					</div>
				</TabsContent>

				<TabsContent value="notifications" className="mt-6 flex flex-col gap-4">
					<div className="flex items-center justify-between rounded-lg border border-border p-4">
						<Label htmlFor="email-summary">Email meeting summaries</Label>
						<Switch id="email-summary" defaultChecked />
					</div>
					<div className="flex items-center justify-between rounded-lg border border-border p-4">
						<Label htmlFor="action-reminders">Action item reminders</Label>
						<Switch id="action-reminders" />
					</div>
				</TabsContent>

				<TabsContent value="ai" className="mt-6 flex flex-col gap-4">
					<div className="flex items-center justify-between rounded-lg border border-border p-4">
						<Label htmlFor="ai-voice">AI voice responses</Label>
						<Switch id="ai-voice" />
					</div>
					<div className="flex items-center justify-between rounded-lg border border-border p-4">
						<Label htmlFor="passive-notes">Passive note generation</Label>
						<Switch id="passive-notes" defaultChecked />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
