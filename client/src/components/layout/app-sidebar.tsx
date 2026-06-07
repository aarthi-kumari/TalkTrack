"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	CheckSquare,
	FileText,
	LayoutDashboard,
	LogOut,
	Plug,
	Settings,
	Sparkles,
	Video,
} from "lucide-react";

import { CreateMeetingDialog } from "@/components/dashboard/CreateMeetingDialog";
import { JoinMeetingDialog } from "@/components/layout/join-meeting-dialog";
import { SidebarRecentMeetings } from "@/components/layout/sidebar-recent-meetings";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/components/ui/sidebar";
import { useUserStore } from "@/stores/user-store";

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/meetings", label: "Meetings", icon: Video },
	{ href: "/notes", label: "Notes", icon: FileText },
	{ href: "/action-items", label: "Action Items", icon: CheckSquare },
	{ href: "/integrations", label: "Integrations", icon: Plug },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
	const pathname = usePathname();
	const { signOut } = useClerk();
	const { dbUser, setDbUser } = useUserStore();

	const initials =
		dbUser?.name
			?.split(" ")
			.map((n) => n[0])
			.join("")
			.slice(0, 2)
			.toUpperCase() ??
		dbUser?.email?.[0]?.toUpperCase() ??
		"?";

	return (
		<Sidebar>
			<SidebarHeader className="border-b border-sidebar-border">
				<Link
					href="/dashboard"
					className="flex items-center gap-2 px-2 py-1 font-semibold"
				>
					<Sparkles className="size-5 text-primary" />
					Meeting AI
				</Link>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent className="flex flex-col gap-2 px-2">
						<CreateMeetingDialog />
						<JoinMeetingDialog />
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>Menu</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) => {
								const active =
									pathname === item.href ||
									(item.href !== "/dashboard" &&
										pathname.startsWith(item.href));
								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton asChild isActive={active}>
											<Link href={item.href}>
												<item.icon />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarSeparator />

				<SidebarGroup>
					<div className="flex items-center justify-between px-2">
						<SidebarGroupLabel className="px-0">
							Recent Meetings
						</SidebarGroupLabel>
						<Link
							href="/meetings"
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							View all
						</Link>
					</div>
					<SidebarGroupContent>
						<SidebarRecentMeetings />
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-sidebar-accent"
						>
							<Avatar size="sm">
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-sm font-medium">
									{dbUser?.name ?? "Guest"}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{dbUser?.email ?? ""}
								</span>
							</span>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56">
						<DropdownMenuItem asChild>
							<Link href="/settings">Account settings</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => {
								setDbUser(null);
								void signOut({ redirectUrl: "/sign-in" });
							}}
						>
							<LogOut />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
