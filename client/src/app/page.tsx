import Link from "next/link";

import { HomeAuthRedirect } from "@/components/home-auth-redirect";
import { Button } from "@/components/ui/button";

export default function HomePage() {
	return (
		<>
			<HomeAuthRedirect />
			<div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
				<div className="max-w-lg text-center">
					<h1 className="text-4xl font-bold tracking-tight">Meeting AI</h1>
					<p className="mt-4 text-muted-foreground">
						Video meetings with live AI assistance, notes, and summaries.
					</p>
				</div>
				<div className="flex gap-3">
					<Button asChild>
						<Link href="/sign-in">Sign in</Link>
					</Button>
					<Button asChild variant="outline">
						<Link href="/sign-up">Sign up</Link>
					</Button>
				</div>
			</div>
		</>
	);
}
