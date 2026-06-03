import { verifyWebhook } from "@clerk/express/webhooks";
import { Router, type Request, type Response } from "express";
import express from "express";
import {
	ClerkUserNotFoundError,
	deleteUserByClerkId,
	resolveClerkUserProfile,
	upsertUserFromClerkProfile,
} from "../services/clerk-user";

const router = Router();

function getSigningSecret(): string | undefined {
	return (
		process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim() ||
		process.env.CLERK_WEBHOOK_SECRET?.trim() ||
		undefined
	);
}

const rawJsonBody = express.raw({
	type: (req) => {
		const contentType = req.headers["content-type"] ?? "";
		return contentType.includes("application/json");
	},
});

router.post("/clerk", rawJsonBody, async (req: Request, res: Response) => {
		try {
			const signingSecret = getSigningSecret();
			if (!signingSecret) {
				return res.status(503).json({
					error: "CLERK_WEBHOOK_SIGNING_SECRET is not configured",
				});
			}

			if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
				return res.status(400).json({
					error: "Webhook body missing — raw JSON parser did not run",
				});
			}

			let evt;
			try {
				evt = await verifyWebhook(req, { signingSecret });
			} catch (error) {
				const detail =
					error instanceof Error ? error.message : "Verification failed";
				console.error("Clerk webhook verify error:", detail);
				return res.status(400).json({ error: "Webhook verification failed" });
			}

			try {
				switch (evt.type) {
					case "user.created":
					case "user.updated": {
						const profile = await resolveClerkUserProfile(
							evt.data as Parameters<typeof resolveClerkUserProfile>[0],
						);
						await upsertUserFromClerkProfile(profile);
						console.log(`Webhook: synced user ${profile.clerkUserId}`);
						break;
					}
					case "user.deleted": {
						const clerkUserId = (evt.data as { id: string }).id;
						await deleteUserByClerkId(clerkUserId);
						console.log(`Webhook: processed user.deleted ${clerkUserId}`);
						break;
					}
					default:
						console.log(`Webhook: unhandled event ${evt.type}`);
				}

				return res.status(200).json({ received: true });
			} catch (error) {
				if (error instanceof ClerkUserNotFoundError) {
					console.warn("Clerk webhook:", error.message);
					return res.status(200).json({
						received: true,
						skipped: "user_not_found_in_clerk",
					});
				}

				const detail =
					error instanceof Error ? error.message : "Processing failed";
				console.error("Clerk webhook processing error:", detail);
				return res.status(500).json({ error: "Webhook processing failed" });
			}
		} catch (error) {
			const detail =
				error instanceof Error ? error.message : "Unexpected error";
			console.error("Clerk webhook error:", detail);
			return res.status(500).json({ error: "Webhook handler error" });
		}
	},
);

export default router;
