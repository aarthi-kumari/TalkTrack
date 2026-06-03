import { createClerkClient } from "@clerk/backend";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import type { UserJSON } from "@clerk/backend";

import { prisma } from "../lib/prisma";

export type ClerkUserProfile = {
	clerkUserId: string;
	email: string;
	name: string | null;
};

export type ClerkWebhookUserData = Pick<
	UserJSON,
	| "id"
	| "email_addresses"
	| "primary_email_address_id"
	| "first_name"
	| "last_name"
	| "external_accounts"
>;

function getClerkClient() {
	return createClerkClient({
		secretKey: process.env.CLERK_SECRET_KEY,
	});
}

function emailFromWebhookPayload(data: ClerkWebhookUserData): string | undefined {
	const fromList =
		data.email_addresses?.find(
			(e) => e.id === data.primary_email_address_id,
		)?.email_address ?? data.email_addresses?.[0]?.email_address;

	const fromExternal = data.external_accounts?.find(
		(a) => a.email_address,
	)?.email_address;

	return fromList ?? fromExternal;
}

export function profileFromClerkWebhookUser(data: ClerkWebhookUserData): ClerkUserProfile {
	const email = emailFromWebhookPayload(data);

	if (!email) {
		throw new Error("Clerk user has no email address in webhook payload");
	}

	const name =
		[data.first_name, data.last_name].filter(Boolean).join(" ") || null;

	return {
		clerkUserId: data.id,
		email,
		name,
	};
}

export class ClerkUserNotFoundError extends Error {
	constructor(clerkUserId: string) {
		super(
			`Clerk user ${clerkUserId} not found (deleted user, or Clerk "test" webhook — sign in for a real event)`,
		);
		this.name = "ClerkUserNotFoundError";
	}
}

/** Webhook payloads are sometimes minimal; fetch full user from Clerk when needed. */
export async function resolveClerkUserProfile(
	webhookData: ClerkWebhookUserData,
): Promise<ClerkUserProfile> {
	if (!webhookData?.id) {
		throw new Error("Webhook user payload is missing id");
	}

	try {
		return profileFromClerkWebhookUser(webhookData);
	} catch (payloadError) {
		try {
			const clerkUser = await getClerkClient().users.getUser(webhookData.id);
			const email = clerkUser.emailAddresses.find(
				(e) => e.id === clerkUser.primaryEmailAddressId,
			)?.emailAddress;

			if (!email) {
				throw new Error(
					`Clerk user ${webhookData.id} has no primary email in Clerk API`,
				);
			}

			return {
				clerkUserId: webhookData.id,
				email,
				name:
					[clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
					null,
			};
		} catch (apiError: unknown) {
			if (
				(isClerkAPIResponseError(apiError) && apiError.status === 404) ||
				(apiError instanceof Error && apiError.message === "Not Found")
			) {
				throw new ClerkUserNotFoundError(webhookData.id);
			}
			const reason =
				payloadError instanceof Error ? payloadError.message : "no email in payload";
			throw new Error(
				`Could not resolve user ${webhookData.id} (${reason})`,
				{ cause: apiError },
			);
		}
	}
}

export async function upsertUserFromClerkProfile(profile: ClerkUserProfile) {
	return prisma.user.upsert({
		where: { clerkUserId: profile.clerkUserId },
		update: {
			email: profile.email,
			name: profile.name,
		},
		create: {
			clerkUserId: profile.clerkUserId,
			email: profile.email,
			name: profile.name,
		},
	});
}

export async function deleteUserByClerkId(clerkUserId: string) {
	try {
		await prisma.user.delete({ where: { clerkUserId } });
	} catch (error) {
		console.warn(
			`Could not delete user ${clerkUserId} (may have hosted meetings):`,
			error,
		);
	}
}
