import type { MeetingNoteContent } from "@/lib/api";

export function notesToMarkdown(params: {
	title: string;
	startedAt?: string;
	content: MeetingNoteContent | null;
}): string {
	const lines = [`# ${params.title}`];

	if (params.startedAt) {
		lines.push(`_${new Date(params.startedAt).toLocaleString()}_`, "");
	}

	const content = params.content;
	if (!content) {
		lines.push("No notes were generated for this meeting.");
		return lines.join("\n");
	}

	if (content.summary) {
		lines.push("## Summary", "", content.summary, "");
	}

	if (content.keyPoints.length > 0) {
		lines.push("## Key points", "");
		for (const item of content.keyPoints) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	if (content.decisions.length > 0) {
		lines.push("## Decisions", "");
		for (const item of content.decisions) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	if (content.actionItems.length > 0) {
		lines.push("## Action items", "");
		for (const item of content.actionItems) {
			const who = item.assignee ? ` (${item.assignee})` : "";
			const due = item.due ? ` due ${item.due}` : "";
			lines.push(`- [ ] ${item.text}${who}${due}`);
		}
		lines.push("");
	}

	if (content.manualNotes.length > 0) {
		lines.push("## Manual notes", "");
		for (const item of content.manualNotes) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	return lines.join("\n").trim() + "\n";
}

export function downloadTextFile(filename: string, contents: string) {
	const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
