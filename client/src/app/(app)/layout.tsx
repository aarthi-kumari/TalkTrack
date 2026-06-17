import dynamic from "next/dynamic";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

const AppSidebar = dynamic(
	() =>
		import("@/components/layout/app-sidebar").then((mod) => mod.AppSidebar),
	{
		loading: () => (
			<aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
				<div className="flex flex-col gap-4 p-4">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-40 w-full" />
				</div>
			</aside>
		),
	},
);

export default function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex h-svh min-h-0 min-w-0 flex-col overflow-hidden">
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto has-[.meeting-app-shell]:overflow-hidden">
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
