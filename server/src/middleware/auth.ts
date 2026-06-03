import { createClerkClient } from "@clerk/backend";
import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

import { upsertUserFromClerkProfile } from "../services/clerk-user";
import { prisma } from "../lib/prisma";

const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY,
});

export async function attachPrismaUser(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const { userId: clerkUserId } = getAuth(req);

		if (!clerkUserId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const dbUser = await prisma.user.findUnique({
			where: { clerkUserId },
		});

		if (!dbUser) {
			return res.status(404).json({
				message:
					"User not synced. Complete sign-in and call POST /api/users/sync.",
				code: "USER_NOT_SYNCED",
			});
		}

		req.dbUser = dbUser;
		next();
	} catch (error) {
		console.error("attachPrismaUser error:", error);
		const message =
			error instanceof Error ? error.message : "Failed to resolve user";
		return res.status(500).json({ message, code: "USER_RESOLVE_ERROR" });
	}
}

export async function syncClerkUserFromAuth(req: Request) {
	const { userId: clerkUserId } = getAuth(req);

	if (!clerkUserId) {
		throw new Error("Unauthorized");
	}

	const clerkUser = await clerkClient.users.getUser(clerkUserId);
	const email = clerkUser.emailAddresses.find(
		(e) => e.id === clerkUser.primaryEmailAddressId,
	)?.emailAddress;

	if (!email) {
		throw new Error("Clerk user has no primary email");
	}

	return upsertUserFromClerkProfile({
		clerkUserId,
		email,
		name:
			[clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
			null,
	});
}
