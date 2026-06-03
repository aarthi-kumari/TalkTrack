import { verifyToken } from "@clerk/backend";
import type { Socket } from "socket.io";

import { prisma } from "../lib/prisma";
import type { SocketUserData } from "./types";

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

	const result = await verifyToken(token, { secretKey });

	if (result.errors || !result.data) {
		throw new Error("Invalid auth token");
	}

	const clerkUserId = result.data.sub;
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
