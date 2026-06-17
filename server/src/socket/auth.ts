import { verifyToken } from "@clerk/backend";
import type { Socket } from "socket.io";

import { prisma } from "../lib/prisma";
import type { SocketUserData } from "./types";

function getAuthorizedParties(): string[] {
	const clientUrl = process.env.CLIENT_URL?.trim() || "http://localhost:3000";
	return [clientUrl, "http://localhost:3000", "http://127.0.0.1:3000"];
}

export async function authenticateSocket(
	socket: Socket,
): Promise<SocketUserData> {
	const token = socket.handshake.auth?.token as string | undefined;

	if (!token?.trim()) {
		throw new Error("Missing auth token");
	}

	const secretKey = process.env.CLERK_SECRET_KEY?.trim();
	if (!secretKey) {
		throw new Error("CLERK_SECRET_KEY is not configured");
	}

	let payload: { sub?: string };
	try {
		payload = await verifyToken(token, {
			secretKey,
			authorizedParties: getAuthorizedParties(),
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid auth token";
		throw new Error(message);
	}

	const clerkUserId = payload.sub;
	if (!clerkUserId) {
		throw new Error("Invalid token subject");
	}

	const dbUser = await prisma.user.findUnique({
		where: { clerkUserId },
	});

	if (!dbUser) {
		throw new Error("User not synced");
	}

	return {
		userId: dbUser.id,
		clerkUserId,
		displayName: dbUser.name ?? dbUser.email,
	};
}
