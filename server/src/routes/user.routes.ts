import { getAuth } from "@clerk/express";
import { Router, type Request, type Response } from "express";

import { attachPrismaUser, syncClerkUserFromAuth } from "../middleware/auth";
import { requireApiAuth } from "../middleware/require-api-auth";
import { prisma } from "../lib/prisma";

const userRoutes = Router();

userRoutes.post("/sync", requireApiAuth, async (req: Request, res: Response) => {
	try {
		const user = await syncClerkUserFromAuth(req);
		return res.status(200).json({ user });
	} catch (error) {
		console.error("User sync error:", error);
		const message =
			error instanceof Error ? error.message : "Failed to sync user";
		const status = message === "Unauthorized" ? 401 : 500;
		return res.status(status).json({ message });
	}
});

userRoutes.get(
	"/me",
	requireApiAuth,
	attachPrismaUser,
	async (req: Request, res: Response) => {
		return res.status(200).json({ user: req.dbUser });
	},
);

userRoutes.get("/me/clerk", requireApiAuth, async (req: Request, res: Response) => {
	const { userId } = getAuth(req);
	const user = await prisma.user.findUnique({
		where: { clerkUserId: userId ?? "" },
	});
	return res.status(200).json({ synced: Boolean(user), user });
});

export default userRoutes;
