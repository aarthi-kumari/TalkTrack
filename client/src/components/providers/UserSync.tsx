"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { useClerkToken } from "@/hooks/use-clerk-token";
import { API_TIMEOUT_MS, ApiError, getCurrentUser, syncUser } from "@/lib/api";
import { readCachedDbUser } from "@/lib/user-cache";
import { useUserStore } from "@/stores/user-store";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error("Account sync timed out")), ms);
		}),
	]);
}

export function UserSync({ children }: { children: React.ReactNode }) {
	const { isLoaded, isSignedIn } = useAuth();
	const getClerkToken = useClerkToken();
	const { setDbUser, setSyncing, setSyncError } = useUserStore();
	const syncedRef = useRef(false);

	useEffect(() => {
		if (!isLoaded) return;

		if (!isSignedIn) {
			syncedRef.current = false;
			setDbUser(null);
			setSyncError(null);
			return;
		}

		if (syncedRef.current) return;

		let cancelled = false;

		async function fetchUser(showLoading: boolean) {
			if (showLoading) {
				setSyncing(true);
				setSyncError(null);
			}

			try {
				const token = await withTimeout(getClerkToken(), API_TIMEOUT_MS);
				if (cancelled) return;

				try {
					const { user } = await withTimeout(
						getCurrentUser(token),
						API_TIMEOUT_MS,
					);
					if (!cancelled) {
						setDbUser(user);
						syncedRef.current = true;
					}
					return;
				} catch (err) {
					const shouldSync =
						err instanceof ApiError &&
						err.status === 404 &&
						err.code === "USER_NOT_SYNCED";
					if (!shouldSync) throw err;
				}

				const { user } = await withTimeout(syncUser(token), API_TIMEOUT_MS);
				if (!cancelled) {
					setDbUser(user);
					syncedRef.current = true;
				}
			} catch (err) {
				if (!cancelled) {
					const message =
						err instanceof Error ? err.message : "Failed to sync user";
					setSyncError(message);
					console.error("User sync failed:", err);
				}
			} finally {
				if (!cancelled && showLoading) setSyncing(false);
			}
		}

		const cached = readCachedDbUser();
		if (cached) {
			setDbUser(cached);
			syncedRef.current = true;
			void fetchUser(false);
			return () => {
				cancelled = true;
			};
		}

		void fetchUser(true);

		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, getClerkToken, setDbUser, setSyncing, setSyncError]);

	return <>{children}</>;
}
