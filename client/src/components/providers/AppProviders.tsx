"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { UserSync } from "./UserSync";

export function AppProviders({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 30_000,
					},
				},
			}),
	);

	return (
		<ClerkProvider>
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					<UserSync>{children}</UserSync>
					<Toaster richColors position="top-center" />
				</TooltipProvider>
			</QueryClientProvider>
		</ClerkProvider>
	);
}
