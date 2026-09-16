"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { syncUser } from "@/lib/api";
import { useApiToken } from "@/hooks/use-api-token";
import { useUserStore } from "@/stores/user-store";

function clerkErrorMessage(error: unknown): string {
	if (error && typeof error === "object" && "errors" in error) {
		const errors = (error as { errors?: { longMessage?: string; message?: string }[] })
			.errors;
		const first = errors?.[0];
		if (first?.longMessage) return first.longMessage;
		if (first?.message) return first.message;
	}
	if (error instanceof Error && error.message) return error.message;
	return "Something went wrong";
}

export default function AccountSettingsPage() {
	const { user, isLoaded } = useUser();
	const { dbUser, setDbUser } = useUserStore();
	const getToken = useApiToken();

	const [name, setName] = useState("");
	const [savingName, setSavingName] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [savingPassword, setSavingPassword] = useState(false);

	useEffect(() => {
		const next =
			dbUser?.name?.trim() ||
			[user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
			"";
		setName(next);
	}, [dbUser?.name, user?.firstName, user?.lastName]);

	const passwordEnabled = user?.passwordEnabled ?? false;
	const email = dbUser?.email ?? user?.primaryEmailAddress?.emailAddress ?? "—";

	async function saveName() {
		const trimmed = name.trim();
		if (!user || !trimmed) {
			toast.error("Enter a name");
			return;
		}

		const parts = trimmed.split(/\s+/);
		const firstName = parts[0] ?? trimmed;
		const lastName = parts.slice(1).join(" ");

		setSavingName(true);
		try {
			await user.update({ firstName, lastName });
			const token = await getToken();
			const { user: synced } = await syncUser(token);
			setDbUser(synced);
			toast.success("Name updated");
		} catch (error) {
			toast.error(clerkErrorMessage(error));
		} finally {
			setSavingName(false);
		}
	}

	async function savePassword() {
		if (!user) return;

		if (newPassword.length < 8) {
			toast.error("New password must be at least 8 characters");
			return;
		}

		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}

		if (passwordEnabled && !currentPassword) {
			toast.error("Enter your current password");
			return;
		}

		setSavingPassword(true);
		try {
			await user.updatePassword({
				newPassword,
				...(passwordEnabled ? { currentPassword } : {}),
			});
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.success(passwordEnabled ? "Password updated" : "Password set");
		} catch (error) {
			toast.error(clerkErrorMessage(error));
		} finally {
			setSavingPassword(false);
		}
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Account settings"
				description="Update your name and password"
			/>

			<Card className="max-w-xl">
				<CardHeader>
					<CardTitle className="text-base">Profile</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="account-name">Name</Label>
						<Input
							id="account-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Your name"
							disabled={!isLoaded || savingName}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="account-email">Email</Label>
						<Input id="account-email" value={email} disabled />
					</div>
					<div>
						<Button
							onClick={() => void saveName()}
							disabled={!isLoaded || savingName || !name.trim()}
						>
							{savingName ? "Saving…" : "Save name"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="max-w-xl">
				<CardHeader>
					<CardTitle className="text-base">Password</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{passwordEnabled ? (
						<div className="flex flex-col gap-2">
							<Label htmlFor="current-password">Current password</Label>
							<Input
								id="current-password"
								type="password"
								autoComplete="current-password"
								value={currentPassword}
								onChange={(event) => setCurrentPassword(event.target.value)}
								disabled={savingPassword}
							/>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							Your account does not have a password yet. Set one below to sign
							in with email next time.
						</p>
					)}
					<div className="flex flex-col gap-2">
						<Label htmlFor="new-password">New password</Label>
						<Input
							id="new-password"
							type="password"
							autoComplete="new-password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							disabled={savingPassword}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="confirm-password">Confirm new password</Label>
						<Input
							id="confirm-password"
							type="password"
							autoComplete="new-password"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							disabled={savingPassword}
						/>
					</div>
					<div>
						<Button
							onClick={() => void savePassword()}
							disabled={!isLoaded || savingPassword || !newPassword}
						>
							{savingPassword
								? "Saving…"
								: passwordEnabled
									? "Update password"
									: "Set password"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
