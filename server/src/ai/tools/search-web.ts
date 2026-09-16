import { getTavilyConfigStatus } from "../../lib/ai-config";

type TavilyResult = {
	title?: string;
	url?: string;
	content?: string;
};

async function searchWithTavily(query: string): Promise<string> {
	const response = await fetch("https://api.tavily.com/search", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			api_key: process.env.TAVILY_API_KEY,
			query,
			max_results: 5,
			search_depth: "basic",
		}),
		signal: AbortSignal.timeout(12_000),
	});

	if (!response.ok) {
		throw new Error(`Tavily search failed (${response.status})`);
	}

	const data = (await response.json()) as {
		answer?: string;
		results?: TavilyResult[];
	};

	const lines = [
		data.answer?.trim(),
		...(data.results ?? []).map((item) => {
			const title = item.title?.trim() || item.url || "Result";
			const snippet = item.content?.trim() ?? "";
			const url = item.url ? ` (${item.url})` : "";
			return `- ${title}${url}: ${snippet}`.trim();
		}),
	].filter(Boolean);

	return lines.join("\n") || "No search results.";
}

async function searchWithDuckDuckGo(query: string): Promise<string> {
	const url = new URL("https://api.duckduckgo.com/");
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("no_html", "1");
	url.searchParams.set("skip_disambig", "1");

	const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
	if (!response.ok) {
		throw new Error(`Web search failed (${response.status})`);
	}

	const data = (await response.json()) as {
		AbstractText?: string;
		AbstractURL?: string;
		Heading?: string;
		RelatedTopics?: { Text?: string; FirstURL?: string }[];
	};

	const lines: string[] = [];
	if (data.AbstractText) {
		const source = data.AbstractURL ? ` (${data.AbstractURL})` : "";
		lines.push(`${data.Heading ?? "Summary"}: ${data.AbstractText}${source}`);
	}

	for (const topic of data.RelatedTopics ?? []) {
		if (topic.Text) {
			lines.push(`- ${topic.Text}${topic.FirstURL ? ` (${topic.FirstURL})` : ""}`);
		}
		if (lines.length >= 6) break;
	}

	return lines.join("\n") || `No instant results for "${query}".`;
}

export async function searchWeb(query: string): Promise<string> {
	const trimmed = query.trim();
	if (!trimmed) return "Search query was empty.";

	if (getTavilyConfigStatus().configured) {
		try {
			return await searchWithTavily(trimmed);
		} catch (error) {
			console.warn("Tavily search failed, falling back:", error);
		}
	}

	try {
		return await searchWithDuckDuckGo(trimmed);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Search failed";
		return `Web search is unavailable: ${message}`;
	}
}
