import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

/** API-friendly auth: returns 401 JSON instead of redirecting (requireAuth redirects). */
export function requireApiAuth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const { userId } = getAuth(req);

	if (!userId) {
		return res.status(401).json({
			message: "Unauthorized",
			code: "UNAUTHORIZED",
		});
	}

	next();
}
