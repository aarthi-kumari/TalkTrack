"use client";

import { useClerkToken } from "./use-clerk-token";

/** @deprecated Use useClerkToken — kept as alias for existing callers */
export function useApiToken() {
	return useClerkToken();
}
