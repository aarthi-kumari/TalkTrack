"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Client redirect for signed-in users — avoids slow server auth() on `/`. */
export function HomeAuthRedirect() {
	const { isLoaded, isSignedIn } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			router.replace("/dashboard");
		}
	}, [isLoaded, isSignedIn, router]);

	return null;
}
