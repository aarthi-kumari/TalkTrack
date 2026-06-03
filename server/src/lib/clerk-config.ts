import type { clerkMiddleware } from "@clerk/express";

type ClerkMiddlewareOptions = NonNullable<Parameters<typeof clerkMiddleware>[0]>;

function trimEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value || undefined;
}

export function validateClerkEnv(): void {
	const secretKey = trimEnv("CLERK_SECRET_KEY");
	const publishableKey = trimEnv("CLERK_PUBLISHABLE_KEY");

	if (!secretKey?.startsWith("sk_")) {
		throw new Error(
			"CLERK_SECRET_KEY is missing or invalid in server/.env (must start with sk_)",
		);
	}

	if (!publishableKey?.startsWith("pk_") || publishableKey.includes("...")) {
		throw new Error(
			"CLERK_PUBLISHABLE_KEY is missing or still a placeholder in server/.env. Copy the same pk_test_... value as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from client/.env.local",
		);
	}
}

export function getClerkMiddlewareOptions(
	authorizedParties: string[],
): ClerkMiddlewareOptions {
	const secretKey = trimEnv("CLERK_SECRET_KEY");
	const publishableKey = trimEnv("CLERK_PUBLISHABLE_KEY");

	return {
		secretKey,
		publishableKey,
		authorizedParties,
	};
}
