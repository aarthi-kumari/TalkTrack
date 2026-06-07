export function Loading({ label = "Loading…" }: { label?: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 p-8">
			<div
				className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
				aria-hidden
			/>
			<p className="text-sm text-muted-foreground">{label}</p>
		</div>
	);
}
