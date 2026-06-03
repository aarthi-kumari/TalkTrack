import type { Request as ExpressRequest } from "express";

/** Adapt Express request (raw body) for @clerk/backend verifyWebhook */
export function expressToWebRequest(req: ExpressRequest): Request {
	const headers = new Headers();

	for (const [key, value] of Object.entries(req.headers)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			for (const v of value) headers.append(key, v);
		} else {
			headers.set(key, value);
		}
	}

	const body =
		req.body instanceof Buffer
			? req.body.toString("utf8")
			: typeof req.body === "string"
				? req.body
				: "";

	return new Request("https://localhost/api/webhooks/clerk", {
		method: req.method,
		headers,
		body: body || undefined,
	});
}
