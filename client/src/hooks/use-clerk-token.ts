"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const jwtTemplate = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;

export function useClerkToken() {
	const { getToken, isSignedIn } = useAuth();

	return useCallback(async () => {
		if (!isSignedIn) {
			throw new Error("Not signed in");
		}

		const token = jwtTemplate
			? await getToken({ template: jwtTemplate })
			: await getToken();

		if (!token) {
			throw new Error("Could not get auth token");
		}

		return token;
	}, [getToken, isSignedIn]);
}
